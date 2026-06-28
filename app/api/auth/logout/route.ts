import { redirect } from 'next/navigation'
import { destroySession } from '@/app/lib/session'

export async function GET() {
    await destroySession()
    redirect('/')
}
