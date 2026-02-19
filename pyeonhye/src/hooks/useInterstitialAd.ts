import { useCallback, useEffect, useRef, useState } from 'react';
import { GoogleAdMob } from '@apps-in-toss/web-framework';

interface AdCallback {
  onDismiss?: () => void;
}

interface AdEvent {
  type?: string;
}

export function useInterstitialAd(adGroupId: string) {
  const [loading, setLoading] = useState(true);
  const dismissRef = useRef<(() => void) | undefined>();
  const cleanupRef = useRef<(() => void) | undefined>();

  const loadAd = useCallback(() => {
    setLoading(true);

    try {
      if (!GoogleAdMob || typeof GoogleAdMob.loadAppsInTossAdMob !== 'function') {
        setLoading(false);
        return;
      }

      const isUnsupported = GoogleAdMob.loadAppsInTossAdMob.isSupported?.() === false;
      if (isUnsupported) {
        setLoading(false);
        return;
      }

      cleanupRef.current?.();
      cleanupRef.current = GoogleAdMob.loadAppsInTossAdMob({
        options: { adGroupId },
        onEvent: (event: AdEvent) => {
          if (event.type === 'loaded') {
            setLoading(false);
          }
        },
        onError: () => {
          setLoading(false);
        },
      });
    } catch {
      setLoading(false);
    }
  }, [adGroupId]);

  useEffect(() => {
    loadAd();

    return () => {
      cleanupRef.current?.();
    };
  }, [loadAd]);

  const showAd = useCallback(
    ({ onDismiss }: AdCallback = {}) => {
      try {
        if (!GoogleAdMob || typeof GoogleAdMob.showAppsInTossAdMob !== 'function') {
          onDismiss?.();
          return;
        }

        if (loading) {
          onDismiss?.();
          return;
        }

        dismissRef.current = onDismiss;

        GoogleAdMob.showAppsInTossAdMob({
          options: { adGroupId },
          onEvent: (event: AdEvent) => {
            if (event.type === 'dismissed' || event.type === 'closed') {
              dismissRef.current?.();
              loadAd();
            }
          },
          onError: () => {
            dismissRef.current?.();
            loadAd();
          },
        });
      } catch {
        onDismiss?.();
      }
    },
    [adGroupId, loadAd, loading],
  );

  return { loading, showAd };
}
