import { corsHeaders } from '../_lib/store'
import { handleRadar } from '../_lib/handler'

type Props = { params: Promise<{ action: string }> }

export async function GET(request: Request, props: Props) {
  const { action } = await props.params
  return handleRadar('h4', 'h4Bias', request, action)
}

export async function POST(request: Request, props: Props) {
  const { action } = await props.params
  return handleRadar('h4', 'h4Bias', request, action)
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() })
}
