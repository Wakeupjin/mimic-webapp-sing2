"use client";

import Image from "next/image";
import Link from "next/link";
import type { Movie } from "../constants/movies";

interface MovieCardProps {
  movie: Movie;
}

export default function MovieCard({ movie }: MovieCardProps) {
  return (
    <Link
      href={`/training/${movie.id}`}
      className="block rounded-lg border border-gray-200 hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-black/40"
      aria-label={`${movie.title} 훈련 페이지로 이동`}
    >
      <div className="aspect-video relative w-full overflow-hidden rounded-t-lg bg-gray-50">
        <Image
          src={movie.thumbnail}
          alt={`${movie.title} 썸네일`}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
          className="object-cover"
          priority={false}
        />
      </div>
      <div className="p-4">
        <h3 className="text-base font-semibold text-gray-900">{movie.title}</h3>
        <p className="mt-1 text-sm text-gray-600 line-clamp-2">{movie.description}</p>
      </div>
    </Link>
  );
}


