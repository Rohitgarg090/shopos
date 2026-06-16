import { Suspense } from 'react';
import CALoginForm from './login-form';

export default function CALoginPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><p>Loading...</p></div>}>
      <CALoginForm />
    </Suspense>
  );
}
