type AuthErrorProps = {
  message: string;
};

export function AuthError({ message }: AuthErrorProps) {
  if (!message) return null;

  return (
    <div
      className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      role="alert"
    >
      {message}
    </div>
  );
}
