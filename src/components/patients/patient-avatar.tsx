'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface PatientAvatarProps {
    id_animal: string | number
    especie: string
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
    className?: string
}

const DOG_AVATARS = ['🐶', '🐕', '🐩', '🐾']
const CAT_AVATARS = ['🐱', '🐈', '🐈‍⬛', '😻']
const BIRD_AVATARS = ['🦜', '🐦', '🐥']
const RABBIT_AVATARS = ['🐰', '🐇']

function getSpeciesAvatar(species: string) {
    const s = species?.toLowerCase() || ''
    if (s.includes('canin') || s.includes('perr')) return DOG_AVATARS[0]
    if (s.includes('felin') || s.includes('gat')) return CAT_AVATARS[0]
    if (s.includes('ave') || s.includes('pajar')) return BIRD_AVATARS[0]
    if (s.includes('conej')) return RABBIT_AVATARS[0]
    return '🐾' // Default
}

function getSpeciesColor(species: string) {
    const s = species?.toLowerCase() || ''
    if (s.includes('canin') || s.includes('perr')) return 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400'
    if (s.includes('felin') || s.includes('gat')) return 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400'
    return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
}

export function PatientAvatar({ id_animal, especie, size = 'md', className }: PatientAvatarProps) {
    const [imgError, setImgError] = useState(false)

    // Size configurations
    const sizes = {
        xs: 'h-6 w-6 text-[10px]',
        sm: 'h-8 w-8 text-xs',
        md: 'h-10 w-10 text-sm',
        lg: 'h-16 w-16 text-2xl',
        xl: 'h-24 w-24 text-4xl',
    }

    const emoji = getSpeciesAvatar(especie)
    const colorClass = getSpeciesColor(especie)
    const imageUrl = `https://developers.vetesoft.org/fotosPacientes/${id_animal}.jpg`

    return (
        <div
            className={cn(
                "relative flex shrink-0 overflow-hidden rounded-full border border-border shadow-sm items-center justify-center",
                sizes[size],
                !imgError ? "bg-white dark:bg-zinc-900" : colorClass,
                className
            )}
        >
            {!imgError ? (
                <img
                    src={imageUrl}
                    alt={`Paciente ${id_animal}`}
                    className="h-full w-full object-cover"
                    onError={() => setImgError(true)}
                />
            ) : (
                <span className="font-bold leading-none select-none">
                    {emoji}
                </span>
            )}
        </div>
    )
}
