import { notFound } from 'next/navigation';
import { getManagerData } from '@/lib/supabase/queries';
import { syncManager } from '@/lib/supabase/sync';
import { computeSlides } from '@/lib/wrapped/slides';
import SlideCarousel from '@/components/wrapped/SlideCarousel';

export default async function WrappedPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const id = Number(teamId);

  if (isNaN(id) || id <= 0) notFound();

  try {
    await syncManager(id);
  } catch (err) {
    console.error('Sync failed, attempting to use cached data:', err);
  }

  const data = await getManagerData(id);
  if (!data) notFound();

  const slides = computeSlides(data);

  const personalitySlide = slides.find((s) => s.type === 'personality');
  const shareData = {
    teamName: data.manager.team_name,
    overallRank: data.manager.summary_overall_rank,
    totalPoints: data.manager.summary_overall_points,
    personality: personalitySlide?.personality ?? 'The Steady Hand',
  };

  return <SlideCarousel slides={slides} shareData={shareData} />;
}
