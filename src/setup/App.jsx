import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Hourglass,
  Rocket,
  Target,
  XCircle
} from 'lucide-react';
import './setup.css';

const API_BASE = '';
const DEFAULT_PORT = 5000;

const STEPS = [
  { index: 1, label: 'Bienvenida' },
  { index: 2, label: 'Dependencias' },
  { index: 3, label: 'Puerto' },
  { index: 4, label: 'Inicio' }
];

const PACKAGE_KEYS = ['flask', 'waitress', 'matplotlib', 'numpy', 'pillow'];

const PACKAGE_LABELS = {
  flask: 'Flask',
  waitress: 'Waitress',
  matplotlib: 'Matplotlib',
  numpy: 'NumPy',
  pillow: 'Pillow'
};

function StatusIcon({ status }) {
  if (!status || status === 'checking') return <Hourglass />;
  if (status === 'ok') return <CheckCircle2 />;
  if (status === 'warning' || status === 'missing') return <AlertTriangle />;
  return <XCircle />;
}

function checkTone(status) {
  if (!status || status === 'checking') return '';
  if (status === 'ok') return 'ok';
  if (status === 'warning' || status === 'missing') return 'warning';
  return 'error';
}

export default function SetupWizard() {
  const [step, setStep] = useState(1);
  const [checks, setChecks] = useState(null);
  const [missingPackages, setMissingPackages] = useState([]);
  const [installing, setInstalling] = useState(false);
  const [portStatus, setPortStatus] = useState('loading');
  const [availablePorts, setAvailablePorts] = useState([]);
  const [selectedPort, setSelectedPort] = useState(DEFAULT_PORT);
  const [launching, setLaunching] = useState(false);
  const [launchResult, setLaunchResult] = useState(null);
  const [errorLog, setErrorLog] = useState([]);
  const [logOpen, setLogOpen] = useState(false);
  const [readyMode, setReadyMode] = useState(null);
  const [modeChecked, setModeChecked] = useState(false);
  const [redirectIn, setRedirectIn] = useState(null);

  useEffect(() => {
    if (readyMode !== 'portable') return;
    setRedirectIn(20);
    const interval = setInterval(() => {
      setRedirectIn(current => {
        if (current <= 1) {
          clearInterval(interval);
          window.location.assign('/app/context');
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [readyMode]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`${API_BASE}/api/health`);
        const data = await response.json();
        if (cancelled) return;
        if (data.mode && data.mode !== 'bootstrap') {
          setReadyMode(data.mode);
        } else {
          setModeChecked(true);
        }
      } catch {
        if (!cancelled) setModeChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const waitForAppReady = async () => {
    const started = Date.now();
    while (Date.now() - started < 20000) {
      try {
        const response = await fetch(`${API_BASE}/api/health`);
        const data = await response.json();
        if (data.mode && data.mode !== 'bootstrap') {
          window.location.assign('/app/context');
          return;
        }
      } catch {
        // El servidor aún no responde durante el handoff
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    window.location.assign(`http://localhost:${selectedPort}/app/context`);
  };

  const logError = message => {
    setErrorLog(current => [...current, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const goToStep = next => setStep(next);

  async function runChecks() {
    try {
      const response = await fetch(`${API_BASE}/api/check-all`);
      const data = await response.json();
      setChecks(data);
      const missing = Object.entries(data.packages || {})
        .filter(([, result]) => result.status === 'missing')
        .map(([key]) => key);
      setMissingPackages(missing);
    } catch (error) {
      logError('Error ejecutando verificaciones: ' + error.message);
    }
  }

  async function installMissingPackages() {
    setInstalling(true);
    for (const pkg of missingPackages) {
      try {
        const response = await fetch(`${API_BASE}/api/install`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ package: pkg })
        });
        const result = await response.json();
        if (!result.success) {
          logError(`Error instalando ${pkg}: ${result.error || result.stderr}`);
        }
      } catch (error) {
        logError(`Error de red instalando ${pkg}: ${error.message}`);
      }
    }
    setInstalling(false);
    await runChecks();
  }

  async function checkPort() {
    setPortStatus('loading');
    try {
      const response = await fetch(`${API_BASE}/api/port/${DEFAULT_PORT}`);
      const result = await response.json();
      if (result.status === 'ok') {
        setPortStatus('available');
        setSelectedPort(DEFAULT_PORT);
      } else {
        setPortStatus('occupied');
        await loadAvailablePorts();
      }
    } catch (error) {
      setPortStatus('error');
      logError('Error verificando puerto: ' + error.message);
    }
  }

  async function loadAvailablePorts() {
    try {
      const response = await fetch(`${API_BASE}/api/ports/available`);
      const result = await response.json();
      const ports = result.ports || [];
      setAvailablePorts(ports);
      if (ports.length > 0) setSelectedPort(ports[0]);
    } catch (error) {
      logError('Error cargando puertos: ' + error.message);
    }
  }

  async function startApp() {
    setLaunching(true);
    setLaunchResult(null);
    try {
      const response = await fetch(`${API_BASE}/api/start-app`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port: selectedPort })
      });
      const result = await response.json();
      if (result.success) {
        setLaunchResult('ok');
        await waitForAppReady();
      } else {
        setLaunchResult('error');
        logError('Error: ' + result.error);
      }
    } catch (error) {
      setLaunchResult('error');
      logError('Error: ' + error.message);
    }
    setLaunching(false);
  }

  useEffect(() => {
    if (step === 2) runChecks();
    if (step === 3) checkPort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const pythonResult = checks?.python;
  const browserResult = checks?.browser;
  const packagesResult = checks?.packages || {};
  const packageEntries = Object.entries(packagesResult);
  const allPackagesOk = packageEntries.length > 0 && packageEntries.every(([, result]) => result.status === 'ok');
  const anyPackageMissing = packageEntries.some(([, result]) => result.status === 'missing');
  const packagesTone = packageEntries.length === 0 ? 'checking' : allPackagesOk ? 'ok' : anyPackageMissing ? 'warning' : 'error';

  if (readyMode) {
    return (
      <div className="setup-container">
        <div className="setup-header">
          <h1>Análisis Estratégico EFI/EFE/DAFO/CAME</h1>
          <p className="subtitle">Asistente de Configuración Inicial</p>
        </div>
        <div className="setup-body">
          <div className="step-panel active">
            <div className="summary-card">
              <div className="summary-icon"><Rocket strokeWidth={1.6} /></div>
              <h2 className="summary-title">Todo en orden</h2>
              <p className="summary-subtitle">
                La aplicación está lista en modo {readyMode === 'portable' ? 'portátil' : 'completo'}.<br />
                Puede pasar directamente al análisis estratégico.
              </p>
              {readyMode === 'portable' && redirectIn > 0 && (
                <p className="summary-message">
                  Será redirigido a la aplicación automáticamente en {redirectIn} segundos.
                </p>
              )}
              <p className="summary-message">
                El asistente de configuración solo aparece en el primer uso o cuando faltan dependencias.
              </p>
            </div>
            <div className="panel-actions">
              <button className="btn-launch" type="button" onClick={() => window.location.assign('/app/context')}>
                Ir a la aplicación {readyMode === 'portable' ? 'ahora' : ''} <Rocket />
              </button>
            </div>
          </div>
        </div>
        <div className="setup-footer">
          <p>Análisis Estratégico EFI/EFE/DAFO/CAME - Tesis</p>
        </div>
      </div>
    );
  }

  if (!modeChecked) {
    return (
      <div className="setup-container">
        <div className="setup-header">
          <h1>Análisis Estratégico EFI/EFE/DAFO/CAME</h1>
          <p className="subtitle">Asistente de Configuración Inicial</p>
        </div>
        <div className="setup-body">
          <div className="port-loading">
            <div className="loading-spinner" />
            <p>Comprobando el estado de la aplicación...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="setup-container">
      <div className="setup-header">
        <h1>Análisis Estratégico EFI/EFE/DAFO/CAME</h1>
        <p className="subtitle">Asistente de Configuración Inicial</p>
      </div>

      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${((step - 1) / 3) * 100}%` }} />
      </div>

      <div className="steps-indicator">
        {STEPS.map((item, index) => (
          <div key={item.index} style={{ display: 'contents' }}>
            {index > 0 && <div className="step-connector" />}
            <div className={`step-dot ${step === item.index ? 'active' : ''} ${step > item.index ? 'completed' : ''}`}>
              <span>{item.index}</span>
              <label>{item.label}</label>
            </div>
          </div>
        ))}
      </div>

      <div className="setup-body">
        {step === 1 && (
          <div className="step-panel active">
            <div className="welcome-content">
              <div className="welcome-icon"><Target strokeWidth={1.6} /></div>
              <h2>Análisis Estratégico</h2>
              <h3>EFI / EFE / DAFO / CAME</h3>
              <p className="welcome-subtitle">Asistente de Configuración Inicial</p>
              <p className="welcome-desc">
                Este asistente verificará que todos los componentes estén
                listos para ejecutar la aplicación. El proceso incluye:
              </p>
              <ul className="welcome-steps">
                <li>Verificación de Python y navegador</li>
                <li>Instalación de dependencias</li>
                <li>Configuración del puerto</li>
              </ul>
              <div className="panel-actions">
                <button className="btn-primary btn-large" type="button" onClick={() => goToStep(2)}>
                  Comenzar <ArrowRight />
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="step-panel active">
            <h2>Verificación del Sistema</h2>
            <p className="panel-desc">Comprobando que todos los componentes estén disponibles...</p>

            <div className="checks-grid">
              <div className={`check-card ${checkTone(pythonResult?.status)}`} id="check-python">
                <div className="check-icon" id="icon-python">
                  <StatusIcon status={pythonResult ? pythonResult.status : 'checking'} />
                </div>
                <div className="check-info">
                  <h3>Python</h3>
                  <p className="check-status">{pythonResult?.message || 'Verificando...'}</p>
                  <p className="check-detail">{pythonResult?.executable || ''}</p>
                </div>
              </div>

              <div className={`check-card ${checkTone(browserResult?.status)}`} id="check-browser">
                <div className="check-icon" id="icon-browser">
                  <StatusIcon status={browserResult ? browserResult.status : 'checking'} />
                </div>
                <div className="check-info">
                  <h3>Navegador</h3>
                  <p className="check-status">{browserResult?.message || 'Verificando...'}</p>
                  <p className="check-detail">
                    {browserResult?.status === 'ok'
                      ? browserResult.primary?.path || ''
                      : 'Chrome o Edge requerido para generar PDF'}
                  </p>
                </div>
              </div>

              <div className={`check-card check-card-wide ${checkTone(packagesTone)}`} id="check-packages">
                <div className="check-icon" id="icon-packages">
                  <StatusIcon status={packagesTone} />
                </div>
                <div className="check-info">
                  <h3>Paquetes Python</h3>
                  <div className="sub-checks">
                    {PACKAGE_KEYS.map(key => {
                      const result = packagesResult[key];
                      const ok = result?.status === 'ok';
                      return (
                        <div className="sub-check" key={key}>
                          <span className="pkg-icon">
                            <StatusIcon status={result ? result.status : 'checking'} />
                          </span>
                          <span className="pkg-name">{PACKAGE_LABELS[key]}</span>
                          <span className={`pkg-status ${ok ? 'ok' : ''} ${result && !ok ? 'error' : ''}`}>
                            {result ? (ok ? result.version || 'OK' : 'No instalado') : '-'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="panel-actions">
              <button className="btn-secondary" type="button" onClick={() => goToStep(1)}>
                <ArrowLeft /> Volver
              </button>
              {missingPackages.length > 0 ? (
                <button className="btn-install" type="button" onClick={installMissingPackages} disabled={installing}>
                  {installing ? 'Instalando...' : 'Instalar Dependencias'}
                </button>
              ) : (
                <button className="btn-primary" type="button" onClick={() => goToStep(3)} disabled={!allPackagesOk}>
                  Siguiente <ArrowRight />
                </button>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="step-panel active">
            <h2>Configuración del Puerto</h2>
            <p className="panel-desc">Verificando disponibilidad del puerto...</p>

            <div className="port-section">
              {portStatus === 'loading' && (
                <div className="port-loading">
                  <div className="loading-spinner" />
                  <p>Verificando puerto {DEFAULT_PORT}...</p>
                </div>
              )}

              {portStatus === 'available' && (
                <div className="port-result">
                  <div className="port-success-icon"><CheckCircle2 strokeWidth={1.8} /></div>
                  <h3>Puerto {DEFAULT_PORT} disponible</h3>
                  <p>El servidor se ejecutará en el puerto predeterminado.</p>
                </div>
              )}

              {portStatus === 'occupied' && (
                <div className="port-result">
                  <div className="port-warning-icon"><AlertTriangle strokeWidth={1.8} /></div>
                  <h3>Puerto {DEFAULT_PORT} está en uso</h3>
                  <p>Seleccione un puerto disponible:</p>
                  <div className="port-options">
                    {availablePorts.length === 0 ? (
                      <p className="no-ports">No se encontraron puertos disponibles</p>
                    ) : (
                      availablePorts.map(port => (
                        <label className="port-option" key={port}>
                          <input
                            type="radio"
                            name="port"
                            value={port}
                            checked={selectedPort === port}
                            onChange={() => setSelectedPort(port)}
                          />
                          <span className="port-radio" />
                          <span className="port-number">Puerto {port}</span>
                          <span className="port-status">Disponible</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}

              {portStatus === 'error' && (
                <p className="error">No se pudo verificar el puerto. Revise el registro de errores.</p>
              )}
            </div>

            <div className="panel-actions">
              <button className="btn-secondary" type="button" onClick={() => goToStep(2)}>
                <ArrowLeft /> Volver
              </button>
              <button
                className="btn-primary"
                type="button"
                onClick={() => goToStep(4)}
                disabled={portStatus !== 'available' && !(portStatus === 'occupied' && selectedPort > 0)}
              >
                Siguiente <ArrowRight />
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="step-panel active">
            <div className="summary-card">
              <div className="summary-icon"><Rocket strokeWidth={1.6} /></div>
              <h2 className="summary-title">Todo listo para iniciar</h2>
              <p className="summary-subtitle">
                La configuración se completó exitosamente.<br />
                Todo está listo para ejecutar la aplicación.
              </p>

              <div className="summary-list">
                <h4>Resumen de configuración:</h4>
                <div className="summary-list-item">
                  <span className="check"><CheckCircle2 strokeWidth={2.2} /></span>
                  <span>Python {checks?.python?.version || ''}</span>
                </div>
                <div className="summary-list-item">
                  <span className="check"><CheckCircle2 strokeWidth={2.2} /></span>
                  <span>{checks?.browser?.primary?.display || 'Navegador'} encontrado</span>
                </div>
                <div className="summary-list-item">
                  <span className="check"><CheckCircle2 strokeWidth={2.2} /></span>
                  <span>
                    {missingPackages.length === 0
                      ? 'Todas las dependencias instaladas'
                      : `${missingPackages.length} paquete(s) instalado(s)`}
                  </span>
                </div>
                <div className="summary-list-item">
                  <span className="check"><CheckCircle2 strokeWidth={2.2} /></span>
                  <span>Puerto {selectedPort} configurado</span>
                </div>
              </div>

              <p className="summary-message">
                El servidor se iniciará y el navegador se abrirá automáticamente.
              </p>
            </div>

            <div className="panel-actions">
              <button className="btn-secondary" type="button" onClick={() => goToStep(3)}>
                <ArrowLeft /> Volver
              </button>
              <button className="btn-launch" type="button" onClick={startApp} disabled={launching}>
                {launching
                  ? 'Iniciando...'
                  : launchResult === 'ok'
                    ? <>Aplicación Iniciada <CheckCircle2 /></>
                    : launchResult === 'error'
                      ? <>Error al iniciar <XCircle /></>
                      : <>Iniciar Aplicación <Rocket /></>}
              </button>
            </div>
          </div>
        )}
      </div>

      {errorLog.length > 0 && (
        <div className="error-log">
          <button className="error-log-header" type="button" onClick={() => setLogOpen(open => !open)}>
            <span>Registro de Errores</span>
            <span>{logOpen ? <ChevronDown /> : <ChevronRight />}</span>
          </button>
          <div className={`error-log-body ${logOpen ? 'open' : ''}`}>
            {errorLog.map((entry, index) => <p key={index}>{entry}</p>)}
          </div>
        </div>
      )}

      <div className="setup-footer">
        <p>Análisis Estratégico EFI/EFE/DAFO/CAME - Tesis</p>
      </div>
    </div>
  );
}
