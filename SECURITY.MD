# Security Policy

## Supported Versions

NovaStore ERP está en fase de desarrollo activo. Ninguna de las versiones inferiores a la versión 1.0.0 se considera estable o segura para uso en producción. Se recomienda a los usuarios que utilicen la última versión disponible para garantizar la mejor experiencia y seguridad. Si preesenta problemas de rendimiento o seguridad, por favor reportarlos a través de los canales oficiales para que puedan ser abordados en futuras actualizaciones.

| Version | Supported      |
| ------- | -------------- |
| < 1.0.0 | :construction: |

## Reporting a Vulnerability

Para reportar una vulnerabilidad, por favor siga estos pasos:

1. Envíe un correo electrónico a [info@dgtecnova.com](mailto:info@dgtecnova.com) con los detalles de la vulnerabilidad. Incluya la siguiente información:
   - Descripción detallada de la vulnerabilidad.
   - Pasos para reproducirla.
   - Impacto potencial.
   - Cualquier evidencia o prueba de concepto que pueda ayudar a entender y resolver el problema.
2. Nuestro equipo de seguridad revisará su informe y se pondrá en contacto con usted para obtener más información si es necesario.
3. Trabajaremos para resolver la vulnerabilidad lo antes posible y le mantendremos informado sobre el progreso.
4. Una vez que la vulnerabilidad haya sido resuelta, le notificaremos y, si lo desea, le daremos crédito por el reporte.
5. Agradecemos su ayuda para mantener NovaStore ERP seguro para todos los usuarios.

## Security Best Practices

- Mantenga su instalación de NovaStore ERP actualizada con las últimas versiones para beneficiarse de las correcciones de seguridad.
- Utilice contraseñas fuertes y únicas para todas las cuentas de usuario.
- Habilite la autenticación de dos factores (2FA) siempre que sea posible.
- Revise y limite los permisos de los usuarios según sea necesario.
- Realice copias de seguridad regulares de sus datos y asegúrese de que estén almacenadas de manera segura.
- Monitoree su sistema para detectar actividades sospechosas o no autorizadas.
- Reporte cualquier vulnerabilidad o problema de seguridad a nuestro equipo de inmediato, empleando los canales oficiales mencionados anteriormente.

## Garantías de acceso comercial y RLS

- El catálogo global `platform_modules` está protegido con RLS; los usuarios autenticados solo pueden leer módulos activos y las mutaciones administrativas requieren capacidades de plataforma.
- Los entitlements de trial se validan contra módulos y capacidades activas. Las acciones `platform.*` no pueden concederse mediante trials comerciales.
- Las mutaciones globales de Billing se registran en auditoría append-only con origen administrativo. La auditoría remota y la aplicación de las migraciones deben verificarse antes de producción.
- La visibilidad del sidebar no es una frontera de seguridad: las páginas, Route Handlers, servicios de dominio y APIs deben repetir los guards de módulo, acción, tenant y capacidad.
- El Centro Único de Roles y Permissions usa capacidades platform explícitas, RLS, RPC con `search_path` fijo, optimistic locking y auditoría before/after; `platform.access.capabilities.manage` permite asignar capacidades tenant/global sin conceder capacidades `platform.*` a roles tenant.
- La función `replace_role_capabilities` no es ejecutable por `anon`; la ejecución pública está revocada y solo se concede a `authenticated` y `service_role`. La protección del último `super_admin` se aplica mediante triggers y validaciones de dominio.
- La policy RLS de inserción directa en `role_capabilities` aplica la misma frontera que el RPC y rechaza `platform.*` y `billing.plans.manage`, incluso para actores con `platform.access.capabilities.manage`.
