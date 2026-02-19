import Image from 'next/image'
import { login } from './actions'

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ message?: string }>
}) {
    const params = await searchParams
    return (
        <div className="flex h-screen w-full items-center justify-center bg-zinc-950 px-4">
            <div className="w-full max-w-sm space-y-8 rounded-lg border border-zinc-800 bg-zinc-900 p-8 shadow-lg">
                <div className="text-center">
                    <Image
                        src="/logo.png"
                        alt="otonbu Garage"
                        width={180}
                        height={72}
                        className="mx-auto h-14 w-auto object-contain"
                        priority
                    />
                    <h1 className="mt-6 text-2xl font-bold tracking-tight text-white">Giriş Yap</h1>
                    <p className="mt-4 rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-sm text-zinc-300">
                        Bu sistem kapalıdır. Sadece yöneticiler tarafından kayıt edilmiş kullanıcılar giriş yapabilir.
                    </p>
                </div>

                <form className="mt-6 space-y-6">
                    <div className="space-y-4 rounded-md shadow-sm">
                        <div>
                            <label htmlFor="email-address" className="sr-only">
                                E-posta adresi
                            </label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="relative block w-full rounded-md border-0 bg-zinc-800 py-2 px-3 text-white placeholder-zinc-500 ring-1 ring-inset ring-zinc-700 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-brand sm:text-sm sm:leading-6"
                                placeholder="E-posta adresi"
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">
                                Şifre
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                className="relative block w-full rounded-md border-0 bg-zinc-800 py-2 px-3 text-white placeholder-zinc-500 ring-1 ring-inset ring-zinc-700 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-brand sm:text-sm sm:leading-6"
                                placeholder="Şifre"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
                            formAction={login}
                            className="group relative flex w-full justify-center rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                        >
                            Giriş Yap
                        </button>
                    </div>

                    {params?.message && (
                        <p className="text-center text-sm text-red-500 bg-red-900/20 p-2 rounded">
                            {params.message}
                        </p>
                    )}
                </form>
            </div>
        </div>
    )
}
