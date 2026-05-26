import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';

const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

const ReCaptcha = forwardRef(({ onChange, onExpired }, ref) => {
  const containerRef = useRef(null);
  const widgetId = useRef(null);

  useImperativeHandle(ref, () => ({
    getResponse: () => {
      if (typeof grecaptcha !== 'undefined' && widgetId.current !== null) {
        return grecaptcha.getResponse(widgetId.current);
      }
      return '';
    },
    reset: () => {
      if (typeof grecaptcha !== 'undefined' && widgetId.current !== null) {
        grecaptcha.reset(widgetId.current);
      }
    }
  }));

  useEffect(() => {
    if (!SITE_KEY || !containerRef.current) return;

    const render = () => {
      if (typeof grecaptcha === 'undefined') return;
      widgetId.current = grecaptcha.render(containerRef.current, {
        sitekey: SITE_KEY,
        theme: 'dark',
        callback: (token) => onChange?.(token),
        'expired-callback': () => onExpired?.()
      });
    };

    if (typeof grecaptcha !== 'undefined' && grecaptcha.render) {
      render();
    } else {
      const check = setInterval(() => {
        if (typeof grecaptcha !== 'undefined' && grecaptcha.render) {
          clearInterval(check);
          render();
        }
      }, 200);
      return () => clearInterval(check);
    }
  }, []);

  if (!SITE_KEY) return null;

  return <div ref={containerRef} />;
});

ReCaptcha.displayName = 'ReCaptcha';

export default ReCaptcha;
