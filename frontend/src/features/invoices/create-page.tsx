import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  FormProvider,
  useForm,
  useFormContext,
  type FieldPath,
} from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { ArrowLeft, Check, FileText, LoaderCircle, Save } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError, errorMessage } from '@/services/api/client';
import type { CreateInvoice, Invoice } from '@/services/api/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createSchema } from './create-schema';
import { today } from './format';
function Field({
  name,
  label,
  type = 'text',
  optional = false,
  step,
  min,
  max,
  multiline = false,
  autoComplete,
}: {
  name: FieldPath<CreateInvoice>;
  label: string;
  type?: string;
  optional?: boolean;
  step?: string;
  min?: string;
  max?: string;
  multiline?: boolean;
  autoComplete?: string;
}) {
  const { register, getFieldState, formState } =
    useFormContext<CreateInvoice>();
  const error = getFieldState(name, formState).error;
  const id = `field-${name}`;
  const common = {
    id,
    'aria-invalid': Boolean(error),
    'aria-required': !optional,
    'aria-describedby': error ? `${id}-error` : undefined,
    ...register(name, { valueAsNumber: type === 'number' }),
  };
  return (
    <div className="form-field">
      <Label htmlFor={id}>
        {label}
        {optional ? (
          <span className="optional">Optional</span>
        ) : (
          <span className="required-mark" aria-hidden="true">
            *
          </span>
        )}
      </Label>
      {multiline ? (
        <Textarea {...common} rows={3} />
      ) : (
        <Input
          {...common}
          type={type}
          step={step}
          min={min}
          max={max}
          autoComplete={autoComplete}
        />
      )}{' '}
      {error && (
        <p id={`${id}-error`} className="field-error" role="alert">
          {error.message}
        </p>
      )}
    </div>
  );
}
export function CreateInvoicePage() {
  const { search } = useLocation();
  const listHref = `/invoices${search}`;
  const navigate = useNavigate(),
    queryClient = useQueryClient();
  const [error, setError] = useState<string>();
  const due = new Date(today() + 'T00:00:00Z');
  due.setUTCDate(due.getUTCDate() + 30);
  const methods = useForm<CreateInvoice>({
    resolver: yupResolver(createSchema),
    defaultValues: {
      invoiceNumber: '',
      invoiceReference: '',
      invoiceDate: today(),
      dueDate: due.toISOString().slice(0, 10),
      currency: 'AUD',
      description: '',
      customer: { fullname: '', email: '', mobileNumber: '', address: '' },
      item: { name: '', quantity: 1, rate: undefined },
      taxPercent: 10,
      discount: 0,
    },
  });
  const submit = methods.handleSubmit(async (values) => {
    setError(undefined);
    try {
      await api<Invoice>('/invoices', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      methods.reset(values);
      await queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice created successfully');
      navigate(listHref);
    } catch (failure) {
      setError(errorMessage(failure));
      if (failure instanceof ApiError && failure.status === 409)
        methods.setError(
          'invoiceNumber',
          { message: 'This invoice number already exists. Choose another.' },
          { shouldFocus: true },
        );
    }
  });
  return (
    <div className="page-body">
      <Link to={listHref} className="back-link">
        <ArrowLeft size={16} />
        Back to invoices
      </Link>
      <div className="page-heading">
        <div>
          <div className="eyebrow muted">MAKE IT OFFICIAL</div>
          <h1>
            Create invoice<span className="title-dot">.</span>
          </h1>
          <p>Start a new invoice. We’ll take care of the numbers.</p>
        </div>
        <span className="draft-pill">
          <span className="status-dot" />
          Saved as Draft
        </span>
      </div>
      <FormProvider {...methods}>
        <form
          aria-label="Create invoice"
          onSubmit={(event) => void submit(event)}
          noValidate
        >
          <fieldset
            disabled={methods.formState.isSubmitting}
            className="create-grid"
          >
            <div className="create-fields">
              <section className="panel form-section">
                <div className="section-title">
                  <span>01</span>
                  <div>
                    <h2>Customer details</h2>
                    <p>Who are you invoicing?</p>
                  </div>
                </div>
                <div className="form-grid">
                  <Field
                    name="customer.fullname"
                    label="Customer name"
                    autoComplete="name"
                  />
                  <Field
                    name="customer.email"
                    label="Customer email"
                    type="email"
                    autoComplete="email"
                  />
                  <Field
                    name="customer.mobileNumber"
                    label="Mobile number"
                    type="tel"
                    optional
                    autoComplete="tel"
                  />
                  <Field
                    name="customer.address"
                    label="Address"
                    optional
                    autoComplete="street-address"
                  />
                </div>
              </section>
              <section className="panel form-section">
                <div className="section-title">
                  <span>02</span>
                  <div>
                    <h2>Invoice information</h2>
                    <p>The dates and details that matter.</p>
                  </div>
                </div>
                <div className="form-grid">
                  <Field name="invoiceNumber" label="Invoice number" />
                  <Field name="invoiceReference" label="Reference" optional />
                  <Field name="invoiceDate" label="Invoice date" type="date" />
                  <Field name="dueDate" label="Due date" type="date" />
                  <div className="form-field">
                    <Label htmlFor="currency">
                      Currency
                      <span className="required-mark" aria-hidden="true">
                        *
                      </span>
                    </Label>
                    <select
                      aria-required="true"
                      id="currency"
                      {...methods.register('currency')}
                    >
                      {[
                        'AUD',
                        'USD',
                        'GBP',
                        'EUR',
                        'SGD',
                        'CAD',
                        'NZD',
                        'JPY',
                        'VND',
                      ].map((currency) => (
                        <option key={currency}>{currency}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-span">
                    <Field
                      name="description"
                      label="Notes / description"
                      optional
                      multiline
                    />
                  </div>
                </div>
              </section>
              <section className="panel form-section">
                <div className="section-title">
                  <span>03</span>
                  <div>
                    <h2>Line item</h2>
                    <p>One item per invoice. Keep it simple.</p>
                  </div>
                </div>
                <Field name="item.name" label="Item name" />
                <div className="form-grid item-fields">
                  <Field
                    name="item.quantity"
                    label="Quantity"
                    type="number"
                    min="1"
                    step="1"
                  />
                  <Field
                    name="item.rate"
                    label="Rate"
                    type="number"
                    min="0.01"
                    step="0.01"
                  />
                  <Field
                    name="taxPercent"
                    label="Tax (%)"
                    optional
                    type="number"
                    min="0"
                    step="0.0001"
                  />
                  <Field
                    name="discount"
                    label="Discount amount"
                    optional
                    type="number"
                    min="0"
                    step="0.01"
                  />
                </div>
              </section>
            </div>
            <aside className="create-aside">
              <div className="panel save-panel">
                <span className="save-icon">
                  <FileText size={27} />
                </span>
                <h2>Ready when you are.</h2>
                <p>
                  Your invoice will be saved as a Draft. All totals are
                  calculated securely when you save.
                </p>
                <div className="save-checklist">
                  <span>
                    <Check size={16} />
                    One customer, one line item
                  </span>
                  <span>
                    <Check size={16} />
                    Tax defaults to 10%
                  </span>
                  <span>
                    <Check size={16} />A unique invoice number
                  </span>
                </div>
                {error && (
                  <p className="form-error" role="alert">
                    {error}
                  </p>
                )}
                <Button
                  type="submit"
                  size="lg"
                  className="save-button"
                  disabled={methods.formState.isSubmitting}
                >
                  {methods.formState.isSubmitting ? (
                    <>
                      <LoaderCircle className="animate-spin" />
                      Saving invoice…
                    </>
                  ) : (
                    <>
                      <Save size={17} />
                      Save invoice
                    </>
                  )}
                </Button>
                <Button asChild variant="ghost" className="cancel-button">
                  <Link to={listHref}>Cancel</Link>
                </Button>
              </div>
              <p className="required-note">
                <span>*</span> Required fields
              </p>
            </aside>
          </fieldset>
        </form>
      </FormProvider>
    </div>
  );
}
