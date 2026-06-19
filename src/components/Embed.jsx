const ALLOW_ATTR = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';

const Embed = ({ src, title, height, style, className }) => {
  return (
    <iframe
      src={src}
      title={title}
      height={height}
      allow={ALLOW_ATTR}
      loading="lazy"
      style={{
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        display: 'block',
        border: 'none',
        ...style,
      }}
      className={className}
    />
  );
};

export default Embed;
