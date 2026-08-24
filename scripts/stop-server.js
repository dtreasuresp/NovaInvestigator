const { execSync } = require('node:child_process')

function stopPortWindows(port) {
  let killed = 0
  try {
    const output = execSync(
      `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique"`,
      { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }
    ).trim()

    if (!output) return 0

    const pids = output
      .split(/\r?\n/)
      .map(p => Number.parseInt(p.trim(), 10))
      .filter(p => !Number.isNaN(p) && p > 0)

    for (const pid of pids) {
      try {
        execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' })
        killed++
      } catch {}
    }
  } catch {}
  return killed
}

function stopPortUnix(port) {
  let killed = 0
  try {
    const output = execSync(`lsof -ti tcp:${port}`, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
    if (!output) return 0
    const pids = output
      .split(/\r?\n/)
      .map(p => Number.parseInt(p.trim(), 10))
      .filter(p => !Number.isNaN(p) && p > 0)

    for (const pid of pids) {
      try {
        execSync(`kill -9 ${pid}`, { stdio: 'ignore' })
        killed++
      } catch {}
    }
  } catch {}
  return killed
}

function stopPort(port) {
  return process.platform === 'win32' ? stopPortWindows(port) : stopPortUnix(port)
}

function main() {
  const args = process.argv.slice(2)
  const isDev = args.includes('--dev') || args.includes('dev')
  const isProd = args.includes('--prod') || args.includes('prod')
  const isAll = args.includes('--all') || (!isDev && !isProd)

  const portsToStop = []

  if (isProd || isAll) {
    const prodPort = Number.parseInt(process.env.PORT || '4102', 10)
    if (!portsToStop.includes(prodPort)) portsToStop.push(prodPort)
  }

  if (isDev || isAll) {
    const devPort = Number.parseInt(process.env.PORT || '4101', 10)
    if (!portsToStop.includes(devPort)) portsToStop.push(devPort)
    if (!portsToStop.includes(3000)) portsToStop.push(3000)
  }

  const mode = isDev ? 'Desarrollo (Dev)' : isProd ? 'Producción (Prod)' : 'Todos los Servidores (Dev & Prod)'

  console.log(`\n🛑 Deteniendo servidor(es) [${mode}] en puerto(s) ${portsToStop.join(', ')}...`)

  let totalStopped = 0
  for (const port of portsToStop) {
    const stopped = stopPort(port)
    if (stopped > 0) {
      console.log(`  ✓ Puerto ${port}: Detenido(s) ${stopped} proceso(s) activo(s).`)
      totalStopped += stopped
    } else {
      console.log(`  ℹ Puerto ${port}: Libre (no se detectaron procesos activos).`)
    }
  }

  if (totalStopped > 0) {
    console.log(`\n✅ Servidor detenido con éxito. Puertos liberados.\n`)
  } else {
    console.log(`\n✅ No se encontraron procesos en ejecución en los puertos verificados.\n`)
  }
}

main()
