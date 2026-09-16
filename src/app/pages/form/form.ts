import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { captureFbclidFromUrl, getFbclidPresent } from '../../utils/fbclidPresent';
import { collectDeviceFingerprint, DeviceFpResult, fingerprintLabelForFormType, getHardwareInfo } from '../../utils/deviceFingerprint';
import { initLeadTelemetry, harvestLeadTelemetry } from '../../utils/leadTelemetry';
import { fetchPageSession, PageSessionFields } from '../../utils/pageSession';
import { ServiceDef, findServiceByTitle } from '../../data/services-data';
import {
  FormQuestion, AREA_CODES_US, TCPA_TEXT, BATH_CODE_BY_LABEL,
  toStateAbbreviation, isValidUsState,
} from '../../data/form-helpers';

@Component({
  selector: 'app-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './form.html',
  styleUrl: './form.css',
})
export class Form implements OnInit, OnDestroy {
  service: ServiceDef | undefined;
  questions: FormQuestion[] = [];
  answers: Record<string, any> = { agreement: false };
  errors: Record<string, string> = {};
  currentStep = 1;
  isSubmitting = false;
  isValidating = false;
  providerQuery = '';
  providerSuggestions: { name: string }[] = [];
  providerLoading = false;
  private providerTimer: ReturnType<typeof setTimeout> | null = null;
  private affiliate: Record<string, string> = {};
  private sessionStart = Date.now();
  private deviceFpPromise: Promise<DeviceFpResult> | null = null;
  private leadTelemetryState: ReturnType<typeof initLeadTelemetry> | null = null;
  private pageSession: PageSessionFields = {
    page_nonce: '', page_session_id: '', page_serve_ts: 0, page_session_ip: '',
    page_session_fetch_status: '', page_session_fetch_note: '',
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const title = params.get('title') || '';
      this.service = findServiceByTitle(title);
      if (!this.service) return;
      this.buildQuestions();
      this.currentStep = 1;
      this.answers = { agreement: false };
      this.errors = {};
      this.captureAffiliate();
      this.injectScripts();
      this.leadTelemetryState = initLeadTelemetry({ briefFieldName: 'BriefRequirement' });
      this.deviceFpPromise = collectDeviceFingerprint(fingerprintLabelForFormType(this.service.formType));
      const base = this.apiBase();
      fetchPageSession(base).then((ps) => (this.pageSession = ps));
      fetch('https://api.ipify.org?format=json')
        .then((r) => r.json())
        .then((d) => { this.answers['ipaddress'] = d.ip; })
        .catch(() => {});
    });
  }

  ngOnDestroy(): void {
    if (this.providerTimer) clearTimeout(this.providerTimer);
  }

  get totalSteps(): number {
    return this.questions.length;
  }

  get currentQuestion(): FormQuestion | undefined {
    return this.questions[this.currentStep - 1];
  }

  get formPhase(): string {
    return this.currentQuestion?.phase || 'project';
  }

  get phaseLabel(): string {
    return this.formPhase === 'contact' ? 'Contact' : 'Information';
  }

  get progressPercent(): number {
    if (!this.totalSteps) return 0;
    return Math.round((this.currentStep / this.totalSteps) * 100);
  }

  get progressRemaining(): number {
    return Math.max(0, this.totalSteps - this.currentStep);
  }

  private apiBase(): string {
    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1' ? 'http://localhost:3018' : window.location.origin;
  }

  private captureAffiliate(): void {
    captureFbclidFromUrl();
    const urlParams = new URLSearchParams(window.location.search);
    const store: Record<string, string> = {};
    ['aff_id', 'transaction_id', 'sub_aff_id'].forEach((key) => {
      const v = urlParams.get(key);
      if (v) store[key] = v;
    });
    if (!store['aff_id'] && urlParams.get('affid')) store['aff_id'] = urlParams.get('affid') || '';
    if (!store['transaction_id'] && urlParams.get('tid')) store['transaction_id'] = urlParams.get('tid') || '';
    if (!store['sub_aff_id'] && urlParams.get('rid')) store['sub_aff_id'] = urlParams.get('rid') || '';
    if (store['transaction_id']) store['click_id'] = store['transaction_id'];
    this.affiliate = store;
    if (window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.origin + window.location.pathname);
    }
  }

  private injectScripts(): void {
    const existingTFInput = document.querySelector('input[name="xxTrustedFormCertUrl"]') as HTMLInputElement | null;
    if (existingTFInput) existingTFInput.value = '';

    document.querySelectorAll('script[src*="api.trustedform.com/trustedform.js"]').forEach((el) => el.remove());

    const tf = document.createElement('script');
    tf.type = 'text/javascript';
    tf.async = true;
    tf.src = ("https:" == document.location.protocol ? 'https' : 'http') +
      '://api.trustedform.com/trustedform.js?field=xxTrustedFormCertUrl&use_tagged_consent=true&l=' +
      new Date().getTime() + Math.random();
    const firstScript = document.getElementsByTagName('script')[0];
    firstScript.parentNode?.insertBefore(tf, firstScript);
    const leadSrc = '//create.lidstatic.com/campaign/548c86c2-3c24-2ec2-b201-274ffb0f5005.js?snippet_version=2';
    if (!document.querySelector(`script[src="${leadSrc}"]`)) {
      const s = document.createElement('script');
      s.id = 'LeadiDscript_campaign';
      s.async = true;
      s.src = leadSrc;
      document.body.appendChild(s);
    }
  }

  private buildQuestions(): void {
    if (!this.service) return;
    const qs: FormQuestion[] = [];
    for (const input of this.service.inputs) {
      const isProvider = input.question === 'Who is your energy provider?';
      qs.push({
        key: input.question,
        label: input.question,
        type: isProvider ? 'provider' : input.type === 'date' ? 'date' : input.options ? 'options' : 'text',
        options: input.options,
        phase: 'project',
        serviceQuestion: input.question,
      });
    }
    qs.push(
      { key: 'zip', label: 'Zip Code', type: 'text', phase: 'details' },
      { key: 'state', label: 'State', type: 'text', phase: 'details' },
      { key: 'city', label: 'City', type: 'text', phase: 'details' },
      { key: 'address', label: 'Street Address', type: 'text', phase: 'details' },
      { key: 'HomeOwner', label: 'Home Owner:', type: 'options', options: ['Yes', 'No'], phase: 'details' },
      { key: 'PropertyType', label: 'Property Type?', type: 'options', options: ['Commercial', 'Multi-Unit', 'Residential'], phase: 'details' },
      { key: 'PurchaseTimeFrame', label: 'Purchase TimeFrame', type: 'options', options: ['1-2 weeks', '3-4 weeks', '5-6 weeks', '7-8 weeks', 'Time Is Flexible'], phase: 'details' },
      { key: 'firstName', label: 'First Name', type: 'text', phase: 'contact' },
      { key: 'lastName', label: 'Last Name', type: 'text', phase: 'contact' },
      { key: 'email', label: 'Email', type: 'email', phase: 'contact' },
      { key: 'phone', label: 'Phone Number', type: 'tel', phase: 'contact' },
      { key: 'BestTimeToCall', label: 'What is the best time to call you?', type: 'options', options: ['Anytime', 'Morning', 'Afternoon', 'Evening'], phase: 'contact' },
      { key: 'BriefRequirement', label: 'Tell us about your service requirements in brief', type: 'textarea', phase: 'contact' },
      { key: 'agreement', label: 'Agreement', type: 'checkbox', phase: 'contact' },
    );
    this.questions = qs;
  }

  selectOption(key: string, opt: string): void {
    this.answers[key] = opt;
    this.errors[key] = '';
    setTimeout(() => this.nextStep(), 180);
  }

  selectProvider(name: string): void {
    this.answers['Who is your energy provider?'] = name;
    this.providerQuery = name;
    this.providerSuggestions = [];
    this.errors['Who is your energy provider?'] = '';
    setTimeout(() => this.nextStep(), 180);
  }

  onProviderInput(value: string): void {
    this.answers['Who is your energy provider?'] = value;
    if (this.providerTimer) clearTimeout(this.providerTimer);
    this.providerTimer = setTimeout(() => this.fetchProviders(value), 180);
  }

  private fetchProviders(query: string): void {
    const q = (query || 'a').trim().toLowerCase();
    this.providerLoading = true;
    const url = window.location.hostname === 'localhost'
      ? `/proxy-providers?q=${encodeURIComponent(q)}`
      : `https://steermarketeer.com/API/providers.php?q=${encodeURIComponent(q)}`;
    this.http.get<any[]>(url).subscribe({
      next: (data) => {
        this.providerSuggestions = (data || [])
          .filter((p) => p?.name?.toLowerCase().includes(q))
          .sort((a, b) => a.name.localeCompare(b.name))
          .slice(0, 30);
        this.providerLoading = false;
      },
      error: () => {
        this.providerSuggestions = [];
        this.providerLoading = false;
      },
    });
  }

  onFieldInput(q: FormQuestion): void {
    if (q.key === 'phone') {
      this.answers['phone'] = String(this.answers['phone'] || '').replace(/\D/g, '').slice(0, 10);
    }
    if (q.key === 'zip') {
      this.answers['zip'] = String(this.answers['zip'] || '').replace(/\D/g, '').slice(0, 5);
      if (String(this.answers['zip']).length === 5) this.lookupZip(this.answers['zip']);
    }
  }

  onPhoneKeydown(event: KeyboardEvent): void {
    const allowed = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
    if (allowed.includes(event.key) || event.ctrlKey || event.metaKey) return;
    if (!/^\d$/.test(event.key)) {
      event.preventDefault();
      return;
    }
    const input = event.target as HTMLInputElement;
    const selected = (input.selectionEnd || 0) - (input.selectionStart || 0);
    const digits = String(this.answers['phone'] || '').replace(/\D/g, '');
    if (digits.length >= 10 && selected === 0) event.preventDefault();
  }

  onPhonePaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pasted = event.clipboardData?.getData('text') || '';
    this.answers['phone'] = pasted.replace(/\D/g, '').slice(0, 10);
  }

  private lookupZip(zip: string): void {
    this.isValidating = true;
    fetch(`https://api.zippopotam.us/us/${zip}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.places?.[0]) {
          this.answers['city'] = data.places[0]['place name'] || this.answers['city'];
          this.answers['state'] = data.places[0]['state abbreviation'] || this.answers['state'];
        }
      })
      .catch(() => {})
      .finally(() => { this.isValidating = false; });
  }

  onEnterKey(e: Event): void {
    e.preventDefault();
    if (this.currentStep < this.totalSteps) this.nextStep();
  }

  validateCurrent(): boolean {
    const q = this.currentQuestion;
    if (!q) return true;
    const val = this.answers[q.key];
    this.errors[q.key] = '';
    if (q.type === 'checkbox') {
      if (!val) {
        this.errors[q.key] = 'You must agree to the terms and conditions';
        return false;
      }
      return true;
    }
    if (val == null || String(val).trim() === '') {
      this.errors[q.key] = 'This field is required';
      return false;
    }
    if (q.key === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(val))) {
      this.errors[q.key] = 'Invalid email address';
      return false;
    }
    if (q.key === 'phone') {
      const phone = String(val);
      if (!/^\d{10}$/.test(phone)) {
        this.errors[q.key] = 'Phone number must be exactly 10 digits';
        return false;
      }
      const ac = parseInt(phone.slice(0, 3), 10);
      if (!AREA_CODES_US.includes(ac)) {
        this.errors[q.key] = 'Please enter a valid US phone number';
        return false;
      }
    }
    if (q.key === 'zip' && !/^\d{5}$/.test(String(val))) {
      this.errors[q.key] = 'Zip code must be exactly 5 digits';
      return false;
    }
    if (q.key === 'state' && !isValidUsState(String(val))) {
      this.errors[q.key] = 'Please enter a valid US state.';
      return false;
    }
    if (q.key === 'BriefRequirement' && String(val).trim().length < 10) {
      this.errors[q.key] = 'Please enter minimum 10 characters';
      return false;
    }
    return true;
  }

  nextStep(): void {
    if (!this.validateCurrent()) return;
    if (this.currentStep < this.totalSteps) this.currentStep += 1;
  }

  previousStep(): void {
    if (this.currentStep > 1) this.currentStep -= 1;
  }

  async submit(): Promise<void> {
    if (!this.validateCurrent() || !this.service) return;
    this.isSubmitting = true;
    this.errors['general'] = '';
    try {
      const payload = await this.buildPayload();
      const res = await fetch(`${this.apiBase()}/server/forward-lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'There was a problem submitting your request.');
      }
      this.router.navigate(['/thank-you']);
    } catch (e: any) {
      this.errors['general'] = e?.message || 'There was a problem submitting your request. Please press Submit again.';
    } finally {
      this.isSubmitting = false;
    }
  }

  private crmOptionCode(questionKey: string, selectedValue: string): string {
    const def = this.service?.inputs.find((i) => i.question === questionKey);
    const opts = def?.options;
    if (!opts?.length) return '';
    const idx = opts.indexOf(selectedValue);
    return idx >= 0 ? String(idx + 1) : '';
  }

  private async buildPayload(): Promise<Record<string, unknown>> {
    const s = this.service!;
    const formData: Record<string, any> = { ...this.answers, ...this.affiliate };
    formData['state'] = toStateAbbreviation(formData['state']);
    const tf = document.querySelector('input[name="xxTrustedFormCertUrl"]') as HTMLInputElement | null;
    formData['xxTrustedFormCertUrl'] = tf?.value || '';
    const lead = document.getElementById('leadid_token') as HTMLInputElement | null;
    formData['universalLeadid'] = lead?.value || formData['universalLeadid'] || '';
    formData['browser'] = navigator.userAgent;
    formData['url'] = window.location.href;
    formData['start'] = this.sessionStart;
    formData['TcpaText'] = TCPA_TEXT;
    formData['formType'] = s.formType;
    formData['category'] = s.category;

    if (formData['HomeOwner'] === 'Yes') formData['homeOwner'] = 1;
    else if (formData['HomeOwner'] === 'No') formData['homeOwner'] = 2;
    delete formData['HomeOwner'];

    const propertyTypeOptions = ['Commercial', 'Multi-Unit', 'Residential'];
    formData['Propertytype'] = propertyTypeOptions.indexOf(formData['PropertyType']) + 1 || '';
    delete formData['PropertyType'];

    const ptf = ['1-2 weeks', '3-4 weeks', '5-6 weeks', '7-8 weeks', 'Time Is Flexible'];
    formData['Purchasetimeframe'] = ptf.indexOf(formData['PurchaseTimeFrame']) + 1 || '';
    delete formData['PurchaseTimeFrame'];

    const btt = ['Anytime', 'Morning', 'Afternoon', 'Evening'];
    formData['Timetocall'] = btt.indexOf(formData['BestTimeToCall']) + 1 || '';
    delete formData['BestTimeToCall'];

    for (const input of s.inputs) {
      const key = input.question;
      const val = formData[key];
      if (val == null) continue;
      if (key === 'Project status?') {
        formData['ProjectStatus'] = val === 'Ready to hire' ? 1 : val === 'Planning and budgeting' ? 2 : '';
      } else if (key === 'What is the nature of your project?') {
        const opts = input.options || [];
        const idx = opts.indexOf(val);
        formData['ProjectNature'] = opts.length === 2 ? (idx === 0 ? 1 : 3) : idx + 1;
      } else if (key === 'Type of remodeling needed' && s.title === 'Bathroom') {
        formData['bathtype'] = BATH_CODE_BY_LABEL[val] || '';
      } else if (input.crmField && input.options) {
        formData[input.crmField] = this.crmOptionCode(key, val);
      } else if (input.crmField) {
        formData[input.crmField] = val;
      }
      delete formData[key];
    }

    const fp = await (this.deviceFpPromise ?? collectDeviceFingerprint(fingerprintLabelForFormType(s.formType)));
    const leadTelemetry = await harvestLeadTelemetry(this.leadTelemetryState);
    formData['sessionDurationMs'] = Date.now() - this.sessionStart;
    formData['deviceFp'] = fp;
    formData['hardwareInfo'] = getHardwareInfo();
    formData['leadTelemetry'] = leadTelemetry;
    formData['fbclid_present'] = getFbclidPresent();

    let ps = this.pageSession;
    if (!ps.page_nonce) {
      ps = await fetchPageSession(this.apiBase(), { phase: 'submit' });
      this.pageSession = ps;
    }
    formData['page_nonce'] = ps.page_nonce || '';
    formData['page_session_id'] = ps.page_session_id || '';
    formData['page_serve_ts'] = ps.page_serve_ts || 0;
    formData['page_session_ip'] = ps.page_session_ip || '';
    formData['page_session_fetch_status'] = ps.page_session_fetch_status || '';
    formData['page_session_fetch_note'] = ps.page_session_fetch_note || '';
    return formData;
  }
}
