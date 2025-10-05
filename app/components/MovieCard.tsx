"use client";

import Image from "next/image";
import Link from "next/link";
import type { Movie } from "../constants/movies";

interface MovieCardProps {
  movie: Movie;
}

export default function MovieCard({ movie }: MovieCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
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
        
        {/* 미믹킹과 게싱 버튼 분리 */}
        <div className="mt-4 flex gap-2">
          <Link
            href={`/sing2/lesson?mode=mimicking`}
            className="flex-1 rounded-md bg-[#60D96C] px-3 py-2 text-center text-sm font-medium text-black transition-colors hover:bg-[#4FC55A] focus:outline-none focus:ring-2 focus:ring-[#60D96C]/40"
          >
            미믹킹
          </Link>
          <Link
            href={`/sing2/lesson?mode=guessing`}
            className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600/40"
          >
            게싱
          </Link>
        </div>
      </div>
    </div>
  );
}


