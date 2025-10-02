import Image from "next/image";
import MovieCard from "./components/MovieCard";
import { MOVIES } from "./constants/movies";

export default function Home() {
  return (
    <main className="min-h-screen px-6 py-10">
      <h1 className="text-2xl font-bold text-gray-900">영화 선택</h1>
      <p className="mt-2 text-sm text-gray-600">연습할 영화를 선택하세요.</p>

      <section className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {MOVIES.map((movie) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </section>
    </main>
  );
}
