import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { FormProvider, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { ArrowRight, Check, FileText, LoaderCircle } from 'lucide-react';
import FormTextInput from '@/components/form/text-input/form-text-input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/services/auth/auth-provider';
import { errorMessage } from '@/services/api/client';
const schema = yup.object({
  email: yup
    .string()
    .trim()
    .lowercase()
    .email('Enter a valid email address')
    .required('Email is required')
    .max(254),
  password: yup.string().required('Password is required').max(128),
});
type Values = yup.InferType<typeof schema>;
export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string>();
  const methods = useForm<Values>({
    resolver: yupResolver(schema),
    defaultValues: { email: '', password: '' },
  });
  if (user) return <Navigate to="/invoices" replace />;
  const submit = methods.handleSubmit(async (values) => {
    setError(undefined);
    try {
      await login(values.email, values.password);
      navigate('/invoices', { replace: true });
    } catch (failure) {
      setError(errorMessage(failure));
    }
  });
  return (
    <div className="login-shell">
      <section className="login-story">
        <div className="brand brand-light">
          <span className="brand-mark">
            <FileText size={22} />
          </span>
          <span>
            simple<strong>invoice</strong>
            <sup>®</sup>
          </span>
        </div>
        <div className="login-story-body">
          <span className="eyebrow">A LITTLE LESS ADMIN</span>
          <h1>
            Your invoices.
            <br />A clearer picture.
          </h1>
          <p>
            A simple space to create invoices, follow their progress, and keep
            your business moving.
          </p>
          <ul>
            <li>
              <Check size={17} />
              Every invoice, in one place
            </li>
            <li>
              <Check size={17} />
              Clear details, down to the last cent
            </li>
            <li>
              <Check size={17} />
              Built for your everyday workflow
            </li>
          </ul>
        </div>
        <div className="login-story-footer">
          GOOD BUSINESS STARTS WITH CLARITY.
        </div>
      </section>
      <main className="login-form-panel">
        <div className="login-form-wrap">
          <span className="eyebrow muted">WELCOME BACK</span>
          <h2>Make yourself at home.</h2>
          <p className="lead">Sign in to your invoice workspace.</p>
          <FormProvider {...methods}>
            <form
              aria-label="Sign in"
              onSubmit={(event) => void submit(event)}
              noValidate
            >
              <FormTextInput<Values>
                name="email"
                label="Email address"
                type="email"
                autoComplete="username"
                autoFocus
              />
              <FormTextInput<Values>
                name="password"
                label="Password"
                type="password"
                autoComplete="current-password"
              />
              {error && (
                <p role="alert" className="form-error">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                size="lg"
                className="login-submit"
                disabled={methods.formState.isSubmitting}
              >
                {methods.formState.isSubmitting ? (
                  <>
                    <LoaderCircle className="animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight size={18} />
                  </>
                )}
              </Button>
            </form>
          </FormProvider>
          <p className="login-hint">
            Need reviewer access? Use the credentials configured in your project
            README.
          </p>
        </div>
        <span className="login-copyright">
          SimpleInvoice · Full stack assessment
        </span>
      </main>
    </div>
  );
}
