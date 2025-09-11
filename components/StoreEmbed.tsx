import { Box, Skeleton } from '@chakra-ui/react';
import { useEffect, useRef, useState } from 'react';

interface Props {
  src: string;
}

export default function StoreEmbed({ src }: Props) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      });
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Basic responsive height heuristic
  const height = typeof window !== 'undefined' && window.innerWidth < 480 ? 1400 : 1000;

  return (
    <Box ref={ref} borderRadius="xl" overflow="hidden" borderWidth="1px">
      {!visible ? (
        <Skeleton height={height + 'px'} />
      ) : (
        <iframe
          style={{ borderRadius: 24, border: 'none' }}
          src={src}
          title="SGT Major Says merch store powered by Spring"
          width="100%"
          height={height}
        />
      )}
    </Box>
  );
}
