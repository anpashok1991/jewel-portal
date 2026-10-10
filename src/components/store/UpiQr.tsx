import QRCode from "qrcode";
import { buildUpiUrl } from "@/lib/upi";

export default async function UpiQr({
  vpa,
  name,
  amountPaise,
  note,
  width = 200,
}: {
  vpa: string;
  name: string;
  amountPaise: number;
  note?: string;
  width?: number;
}) {
  if (!vpa) return null;
  const url = buildUpiUrl({ vpa, name, amountPaise, note, transactionRef: note });
  const dataUrl = await QRCode.toDataURL(url, { margin: 1, width: width * 2, color: { dark: "#1a1a1a", light: "#ffffff" } });
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={dataUrl} alt="Scan to pay via UPI" width={width} height={width} />
  );
}
