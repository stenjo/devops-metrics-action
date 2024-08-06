import * as process from 'process'
import * as cp from 'child_process'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config()

describe.skip('Deploy rate weekly should', () => {
  test('read newline separated repo inputs', () => {
    process.env['INPUT_REPO'] = 'Middager \n devops-metrics-action'
    process.env['INPUT_OWNER'] = 'stenjo'

    const ip: string = path.join(__dirname, '../src/index.ts')
    const result: string = cp
      .execSync(`npx ts-node ${ip}`, { env: process.env })
      .toString()

    expect(result).toContain('2 repositor(y|ies) registered.')
  })

  test('use repo array list input', () => {
    process.env['INPUT_REPO'] = '[Middager, dora]'
    process.env['INPUT_OWNER'] = 'stenjo'

    const np = process.execPath
    const ip = path.join(__dirname, '..', 'out', 'index.js')
    const options: cp.ExecFileSyncOptions = {
      env: process.env
    }

    const result: string = cp.execFileSync(np, [ip], options).toString()

    expect(result).toContain('stenjo/Middager')
    expect(result).toContain('stenjo/dora')
  })

  test('use single repo input', () => {
    process.env['INPUT_REPO'] = 'Middager'
    process.env['INPUT_OWNER'] = 'stenjo'
    process.env['INPUT_LOGGING'] = 'true'
    process.env['INPUT_FILTERED'] = 'true'

    const np = process.execPath
    const ip = path.join(__dirname, '..', 'out', 'index.js')
    const options: cp.ExecFileSyncOptions = {
      env: process.env
    }

    const result: string = cp.execFileSync(np, [ip], options).toString()

    expect(result).toContain('stenjo/Middager')
    expect(result).toContain('name=lead-time::0')
    // console.log(result)
  })
})
