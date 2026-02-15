import { login, signup } from './actions'

export default function LoginPage({
    searchParams,
}: {
    searchParams: { message: string }
}) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-zinc-950 px-4">
            <div className="w-full max-w-sm space-y-8 rounded-lg border border-zinc-800 bg-zinc-900 p-8 shadow-lg">
                <div className="text-center">
                    <h1 className="text-2xl font-bold tracking-tight text-white">Giriş Yap</h1>
                    <p className="mt-2 text-sm text-zinc-400">
                        Otonbu&apos;ya erişmek için
                    </p>
                </div>

                <form className="mt-8 space-y-6">
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
                                className="relative block w-full rounded-md border-0 bg-zinc-800 py-2 px-3 text-white placeholder-zinc-500 ring-1 ring-inset ring-zinc-700 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6"
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
                                className="relative block w-full rounded-md border-0 bg-zinc-800 py-2 px-3 text-white placeholder-zinc-500 ring-1 ring-inset ring-zinc-700 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6"
                                placeholder="Şifre"
                            />
                        </div>
                        <div>
                            <label htmlFor="fullName" className="sr-only">
                                Ad Soyad (Sadece kayıt için)
                            </label>
                            <input
                                id="fullName"
                                name="fullName"
                                type="text"
                                className="relative block w-full rounded-md border-0 bg-zinc-800 py-2 px-3 text-white placeholder-zinc-500 ring-1 ring-inset ring-zinc-700 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6"
                                placeholder="Ad Soyad (Kayıt için)"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
                            formAction={login}
                            className="group relative flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                        >
                            Giriş Yap
                        </button>
                        <button
                            formAction={signup}
                            className="group relative flex w-full justify-center rounded-md border border-zinc-700 bg-transparent px-3 py-2 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-600"
                        >
                            Kayıt Ol
                        </button>
                    </div>

                    {searchParams?.message && (
                        <p className="text-center text-sm text-red-500 bg-red-900/20 p-2 rounded">
                            {searchParams.message}
                        </p>
                    )}
                </form>
            </div>
        </div>
    )
}
