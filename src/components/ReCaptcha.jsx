import { useRef, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';

const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
const SCRIPT_ID = 'recaptcha-v3-script';

function ensureReCaptchaScript() {
  if (!SITE_KEY || typeof document === 'undefined') return;
  if (document.getElementById(SCRIPT_ID)) return;

  const script = document.createElement('script');
  script.id = SCRIPT_ID;
  script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(SITE_KEY)}`;
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}

const ReCaptcha = forwardRef(({ onChange, onExpired }, ref) => {
  const tokenRef = useRef('');
  const timerRef = useRef(null);

  const refreshToken = useCallback(() => {
    if (typeof grecaptcha === 'undefined' || !SITE_KEY) return;
    try {
      grecaptcha.ready(() => {
        grecaptcha.execute(SITE_KEY, { action: 'submit' }).then((token) => {
          if (token) {
            tokenRef.current = token;
            onChange?.(token);
          }
        });
      });
    } catch {
    }
  }, [onChange]);

  useImperativeHandle(ref, () => ({
    getResponse: () => tokenRef.current,
    reset: () => {
      tokenRef.current = '';
      refreshToken();
    }
  }));

  useEffect(() => {
    if (!SITE_KEY) return;
    ensureReCaptchaScript();

    const check = setInterval(() => {
      if (typeof grecaptcha !== 'undefined' && grecaptcha.ready) {
        clearInterval(check);
        refreshToken();
        timerRef.current = setInterval(refreshToken, 90000);
      }
    }, 200);

    return () => {
      clearInterval(check);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [refreshToken]);

  if (!SITE_KEY) return null;

  return null;
});

ReCaptcha.displayName = 'ReCaptcha';

export default ReCaptcha;
