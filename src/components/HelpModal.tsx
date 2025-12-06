'use client'

import { useI18n } from '@/lib/i18n'

interface HelpModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const { t } = useI18n()

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-amber-50 dark:bg-slate-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-amber-200 dark:border-slate-700 sticky top-0 bg-amber-50 dark:bg-slate-900">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {t.help.title}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-amber-100 dark:hover:bg-slate-800 rounded text-gray-700 dark:text-gray-300"
              aria-label={t.help.close}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-6">
            {/* Pagination Mode */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                {t.help.sections.pagination.title}
              </h3>

              {/* Horizontal */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-amber-700 dark:text-sky-400 mb-2">
                  {t.help.sections.pagination.horizontal.title}
                </h4>
                <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  {t.help.sections.pagination.horizontal.items.map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-amber-600 dark:text-sky-500">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Vertical */}
              <div>
                <h4 className="text-sm font-medium text-amber-700 dark:text-sky-400 mb-2">
                  {t.help.sections.pagination.vertical.title}
                </h4>
                <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  {t.help.sections.pagination.vertical.items.map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-amber-600 dark:text-sky-500">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Scroll Mode */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                {t.help.sections.scroll.title}
              </h3>

              {/* Horizontal */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-amber-700 dark:text-sky-400 mb-2">
                  {t.help.sections.scroll.horizontal.title}
                </h4>
                <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  {t.help.sections.scroll.horizontal.items.map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-amber-600 dark:text-sky-500">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Vertical */}
              <div>
                <h4 className="text-sm font-medium text-amber-700 dark:text-sky-400 mb-2">
                  {t.help.sections.scroll.vertical.title}
                </h4>
                <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  {t.help.sections.scroll.vertical.items.map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-amber-600 dark:text-sky-500">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Common */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                {t.help.sections.common.title}
              </h3>
              <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                {t.help.sections.common.items.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-amber-600 dark:text-sky-500">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-amber-200 dark:border-slate-700">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-amber-700 dark:bg-sky-600 text-white rounded hover:bg-amber-800 dark:hover:bg-sky-700 transition"
            >
              {t.help.close}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
