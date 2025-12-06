'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useI18n } from '@/lib/i18n'
import { usePathname } from 'next/navigation'
import { getBasePath } from '@/lib/utils/basePath'

export default function Header() {
  const { t } = useI18n()
  const pathname = usePathname()
  const basePath = getBasePath()

  const navItems = [
    { href: '/', label: t.common.home },
    { href: '/catalog', label: t.common.catalog },
    { href: '/settings', label: t.common.settings },
    { href: '/about', label: t.common.about },
  ]

  return (
    <header className="bg-amber-50 dark:bg-slate-800 border-b border-amber-200 dark:border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src={`${basePath}/icons/icon-64x64.png`}
              alt="DeusLibri"
              width={40}
              height={40}
              className="rounded-lg"
            />
            <span className="text-2xl font-bold text-amber-700 dark:text-sky-400">
              DeusLibri
            </span>
          </Link>
          <ul className="flex gap-6">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`transition ${
                    pathname === item.href
                      ? 'text-amber-700 dark:text-sky-400 font-semibold'
                      : 'text-gray-700 dark:text-gray-300 hover:text-amber-700 dark:hover:text-sky-400'
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  )
}
