export async function register() {
    if (process.env.NEXT_RUNTIME !== 'edge') {
        await import('@/app/lib/logger')
        await import('@/app/lib/database')
        await import('@/app/lib/users')
        await import('@/app/lib/stats')
    }
}
