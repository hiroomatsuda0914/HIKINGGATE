// トップページ（/）。地図 UI を全画面で表示する。
// Server Component — クライアント地図は MapContainerWrapper 経由で読み込む。
import MapContainerWrapper from '../components/MapContainerWrapper';

export default function Home() {
  return (
    <main className="h-screen w-full">
      <MapContainerWrapper />
    </main>
  );
}

