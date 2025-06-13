// components/Logo.tsx

import { cn } from "@/lib/utils"; // Impor cn jika perlu untuk menggabungkan class
import { PiggyBank } from "lucide-react";
import Link from "next/link";

// Definisikan tipe untuk props agar lebih jelas
interface LogoProps {
  showIcon?: boolean; // Prop untuk menampilkan/menyembunyikan ikon
  showText?: boolean; // Prop untuk menampilkan/menyembunyikan teks
  className?: string; // Prop untuk kustomisasi class dari luar
}

// Komponen utama yang sekarang bisa dikonfigurasi
export default function Logo({
  showIcon = true,
  showText = true,
  className,
}: LogoProps) {
  return (
    // DIPERBAIKI: Selalu gunakan <Link> dari Next.js untuk navigasi internal
    <Link href="/" className={cn("flex items-center gap-2", className)}>
      {/* Tampilkan ikon secara kondisional berdasarkan prop */}
      {showIcon && (
        <PiggyBank
          // PERBAIKAN: class 'stroke' yang tidak perlu dihapus
          className="h-11 w-11 stroke-amber-500 stroke-[1.5]"
          aria-hidden="true" // Ikon bersifat dekoratif, sembunyikan dari screen reader
        />
      )}
      {/* Tampilkan teks secara kondisional berdasarkan prop */}
      {showText && (
        <p className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-3xl font-bold leading-tight tracking-tighter text-transparent">
          BudgetTracker
        </p>
      )}
    </Link>
  );
}
