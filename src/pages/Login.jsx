import { useCallback, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { useGoogleSignIn } from '../auth/useGoogleSignIn.js';
import { Logo } from '../components/Logo.jsx';
import './Login.css';

export function LoginPage() {
  const { user, loginWithGoogle, loading } = useAuth();
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleCredential = useCallback(async (idToken) => {
    setSubmitting(true);
    setError(null);
    try {
      await loginWithGoogle(idToken);
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión');
      setSubmitting(false);
    }
  }, [loginWithGoogle]);

  const buttonRef = useGoogleSignIn({
    onCredential: handleCredential,
    onError: (err) => setError(err.message),
  });

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  return (
    <div className="login-screen">
      <div className="login-card fade-in">
        <div className="login-brand">
          <Logo size={48} />
        </div>

        <h1 className="login-title">Orion</h1>
        <p className="login-subtitle">
          Control de gastos. Sin ruido.
        </p>

        <div className="login-actions">
          {submitting ? (
            <div className="loading">Iniciando sesión</div>
          ) : (
            <div ref={buttonRef} className="google-btn-wrap" />
          )}
        </div>

        {error && (
          <div className="error-banner login-error">{error}</div>
        )}

        <p className="login-foot">
          Al continuar aceptas el uso de cookies para mantener tu sesión.
        </p>
      </div>
    </div>
  );
}
