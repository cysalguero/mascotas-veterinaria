import Link from "next/link";
import { Dog, ArrowRight, ShieldCheck, HeartPulse, Activity } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-white font-sans text-zinc-900 selection:bg-blue-100 italic-none">
      {/* Hero Section */}
      <main className="flex-grow flex flex-col items-center justify-center px-6 py-24 text-center max-w-5xl mx-auto space-y-12 animate-in fade-in duration-1000">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-100 text-zinc-600 text-xs font-black uppercase tracking-widest border border-zinc-200">
            <Dog size={14} className="text-zinc-900" /> Sistema de Gestión Integral
          </div>
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-zinc-900 leading-[0.9]">
            Mascotas <br />
            <span className="text-blue-600">Clinica Veterinaria</span>
          </h1>
          <p className="text-zinc-500 text-xl md:text-2xl font-medium max-w-2xl mx-auto leading-tight italic">
            Excelencia médica y administrativa para el cuidado de quienes más quieres.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center w-full">
          <Link
            href="/login"
            className="h-16 px-10 bg-zinc-900 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:bg-black transition-all shadow-2xl hover:scale-[1.02]"
          >
            Entrar al Sistema <ArrowRight size={20} />
          </Link>
          <div className="h-16 px-10 border-2 border-zinc-100 rounded-2xl font-black text-lg flex items-center justify-center text-zinc-400">
            v2.0 Production
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12 w-full text-left">
          <div className="p-8 rounded-[32px] bg-zinc-50 border border-zinc-100 space-y-4">
            <div className="h-12 w-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
              <ShieldCheck size={24} />
            </div>
            <h3 className="font-black text-lg tracking-tight">Seguridad Total</h3>
            <p className="text-zinc-500 text-sm font-medium">Protección de datos médicos y financieros bajo estándares de encriptación modernos.</p>
          </div>
          <div className="p-8 rounded-[32px] bg-zinc-50 border border-zinc-100 space-y-4">
            <div className="h-12 w-12 bg-green-100 rounded-2xl flex items-center justify-center text-green-600">
              <Activity size={24} />
            </div>
            <h3 className="font-black text-lg tracking-tight">Métricas en Vivo</h3>
            <p className="text-zinc-500 text-sm font-medium">Seguimiento instantáneo de ventas, comisiones y metas de productividad mensual.</p>
          </div>
          <div className="p-8 rounded-[32px] bg-zinc-50 border border-zinc-100 space-y-4">
            <div className="h-12 w-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600">
              <HeartPulse size={24} />
            </div>
            <h3 className="font-black text-lg tracking-tight">Cuidado Animal</h3>
            <p className="text-zinc-500 text-sm font-medium">Digitalización completa de historial médico y control administrativo de servicios.</p>
          </div>
        </div>
      </main>

      <footer className="py-10 text-center border-t border-zinc-100">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">
          © 2025 Mascotas Clinica Veterinaria • Todos los derechos reservados
        </p>
      </footer>
    </div>
  );
}
