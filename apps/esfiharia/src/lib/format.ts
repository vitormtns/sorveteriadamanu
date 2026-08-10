export const formatMoney = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    value,
  );

export function formatElapsed(iso: string, now = Date.now()): string {
  const minutes = Math.max(
    0,
    Math.floor((now - new Date(iso).getTime()) / 60_000),
  );
  if (minutes < 1) return "Agora";
  if (minutes < 60) return `Há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `Há ${hours} h`;
}
