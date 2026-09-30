export function Logo({ className = 'size-8' }: { className?: string }) {
  return (
    <img
      src='/logo.png'
      alt='Norrna'
      aria-hidden='true'
      className={className + ' rounded-lg object-cover'}
    />
  )
}