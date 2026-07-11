import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

// Extender Window para o prompt pré-capturado no index.html
declare global {
  interface Window {
    __pwaPrompt: BeforeInstallPromptEvent | null;
  }
}

interface UsePwaInstallReturn {
  isInstallable: boolean;
  isInstalled: boolean;
  install: () => Promise<void>;
}

export function usePwaInstall(): UsePwaInstallReturn {
  // Inicializa já com o prompt caso tenha sido capturado antes do React montar
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    () => window.__pwaPrompt ?? null
  );

  const [isInstalled, setIsInstalled] = useState(() => {
    // Verifica se já está rodando em modo standalone (instalado)
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    );
  });

  useEffect(() => {
    // Listener para capturar o prompt se chegar depois do React montar
    const handleInstallable = (e: Event) => {
      const customEvent = e as CustomEvent<BeforeInstallPromptEvent>;
      setDeferredPrompt(customEvent.detail);
    };

    // Listener para quando o app é instalado
    const handleInstalled = () => {
      window.__pwaPrompt = null;
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    // Fallback: escuta o evento nativo também (redundância)
    const handleNativePrompt = (e: Event) => {
      e.preventDefault();
      const prompt = e as BeforeInstallPromptEvent;
      window.__pwaPrompt = prompt;
      setDeferredPrompt(prompt);
    };

    window.addEventListener('pwa-installable', handleInstallable);
    window.addEventListener('pwa-installed', handleInstalled);
    window.addEventListener('beforeinstallprompt', handleNativePrompt);
    window.addEventListener('appinstalled', handleInstalled);

    // Verificar mudança de display mode (ex: usuário instalou por outro meio)
    const mq = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = () => setIsInstalled(mq.matches);
    mq.addEventListener('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('pwa-installable', handleInstallable);
      window.removeEventListener('pwa-installed', handleInstalled);
      window.removeEventListener('beforeinstallprompt', handleNativePrompt);
      window.removeEventListener('appinstalled', handleInstalled);
      mq.removeEventListener('change', handleDisplayModeChange);
    };
  }, []);

  const install = async () => {
    const prompt = deferredPrompt ?? window.__pwaPrompt;
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') {
      window.__pwaPrompt = null;
      setDeferredPrompt(null);
    }
  };

  return {
    isInstallable: !!(deferredPrompt ?? window.__pwaPrompt) && !isInstalled,
    isInstalled,
    install,
  };
}
