import { useEffect, useRef } from 'react';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

/**
 * Hook que renderiza el botón de Google Sign-In en el ref dado
 * y llama a onCredential con el ID token cuando el usuario autentica.
 */
export function useGoogleSignIn({ onCredential, onError }) {
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!buttonRef.current) return;

    if (!GOOGLE_CLIENT_ID) {
      onError?.(new Error('Falta VITE_GOOGLE_CLIENT_ID en las variables de entorno'));
      return;
    }

    let attempts = 0;
    const maxAttempts = 50; // 5 segundos esperando al script de Google

    const tryRender = () => {
      // El script de Google se carga async desde index.html
      if (!window.google?.accounts?.id) {
        attempts++;
        if (attempts > maxAttempts) {
          onError?.(new Error('No se pudo cargar Google Sign-In'));
          return;
        }
        setTimeout(tryRender, 100);
        return;
      }

      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            if (response.credential) {
              onCredential(response.credential);
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        if (buttonRef.current) {
          window.google.accounts.id.renderButton(buttonRef.current, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: 280,
          });
        }
      } catch (err) {
        onError?.(err);
      }
    };

    tryRender();
  }, [onCredential, onError]);

  return buttonRef;
}
