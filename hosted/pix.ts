export function crc16(value: string) {
  let crc = 0xffff;
  for (const ch of new TextEncoder().encode(value)) {
    crc ^= ch << 8;
    for (let i = 0; i < 8; i++)
      crc = (crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}
const clean = (s: string, max: number) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 .-]/g, "")
    .slice(0, max)
    .trim();
const field = (id: string, value: string) =>
  id +
  new TextEncoder().encode(value).length.toString().padStart(2, "0") +
  value;
export function pixPayload({
  key,
  name,
  city,
  amount,
  reference,
}: {
  key: string;
  name: string;
  city: string;
  amount: number;
  reference: string;
}) {
  if (!name || !city || !key || amount < 1)
    throw Error(
      "Preencha titular, cidade e chave Pix antes de gerar a cobrança.",
    );
  const merchant = field("00", "BR.GOV.BCB.PIX") + field("01", key);
  const code =
    field("00", "01") +
    field("26", merchant) +
    field("52", "0000") +
    field("53", "986") +
    field("54", (amount / 100).toFixed(2)) +
    field("58", "BR") +
    field("59", clean(name, 25)) +
    field("60", clean(city, 15)) +
    field(
      "62",
      field("05", clean(reference.replace(/[^a-zA-Z0-9]/g, ""), 25)),
    ) +
    "6304";
  return code + crc16(code);
}
