import { NextRequest, NextResponse } from 'next/server'
import { sql, initDb } from '@/lib/db'
import { auth } from '@/auth'
import { slugify } from '@/lib/utils'

export async function GET() {
  try {
    await initDb()
    const proposals = await sql`
      SELECT id, slug, test_name, created_at, updated_at, created_by
      FROM proposals
      ORDER BY created_at DESC
    `
    return NextResponse.json(proposals)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to fetch proposals' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await initDb()
    const body = await req.json()
    const { test_name, steps = [], ...rest } = body

    if (!test_name?.trim()) {
      return NextResponse.json({ error: 'test_name is required' }, { status: 400 })
    }

    let slug = slugify(test_name)
    const existing = await sql`SELECT slug FROM proposals WHERE slug LIKE ${slug + '%'}`
    if (existing.length > 0) slug = `${slug}-${existing.length + 1}`

    const [proposal] = await sql`
      INSERT INTO proposals (
        slug, test_name, created_by,
        flow_name, canvas_link, entry_trigger, entry_rules, exit_rules,
        primary_goal, secondary_goals,
        test_direction, test_hypothesis, hypothesis_reasons, hypothesis_exclusion,
        expected_learning_1, expected_learning_2, expected_learning_3,
        next_test_1, next_test_2, next_test_3,
        steps
      ) VALUES (
        ${slug}, ${test_name}, ${session.user?.email ?? ''},
        ${rest.flow_name ?? ''}, ${rest.canvas_link ?? ''}, ${rest.entry_trigger ?? ''},
        ${rest.entry_rules ?? ''}, ${rest.exit_rules ?? ''},
        ${rest.primary_goal ?? ''}, ${rest.secondary_goals ?? ''},
        ${rest.test_direction ?? ''}, ${rest.test_hypothesis ?? ''},
        ${rest.hypothesis_reasons ?? ''}, ${rest.hypothesis_exclusion ?? ''},
        ${rest.expected_learning_1 ?? ''}, ${rest.expected_learning_2 ?? ''}, ${rest.expected_learning_3 ?? ''},
        ${rest.next_test_1 ?? ''}, ${rest.next_test_2 ?? ''}, ${rest.next_test_3 ?? ''},
        ${JSON.stringify(steps)}
      )
      RETURNING *
    `
    return NextResponse.json(proposal, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to create proposal' }, { status: 500 })
  }
}
