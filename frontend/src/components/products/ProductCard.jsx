import { Link } from 'react-router-dom';
import { FaHeart, FaShoppingCart } from 'react-icons/fa';
import { formatCurrency } from '../../utils/helpers';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80';

const ProductCard = ({
  product,
  onAdd,
  href,
  badge,
  showWishlist = false,
  compact = false,
}) => {
  const image = product.image_url || FALLBACK_IMAGE;
  const label = badge
    || (product.is_deal_of_day ? 'DEAL' : null)
    || (product.is_featured ? (product.featured_badge || 'Featured') : 'NEW');
  const title = <h4>{product.name}</h4>;

  return (
    <article
      className={`arrival-card ${compact ? 'arrival-card--compact' : ''} ${
        product.stock_quantity <= 0 ? 'is-disabled' : ''
      }`}
    >
      <div className="arrival-card__top">
        <span className="arrival-badge">{label}</span>
        {showWishlist && (
          <button type="button" className="wishlist-btn" aria-label="Add to wishlist">
            <FaHeart />
          </button>
        )}
      </div>
      {href ? (
        <Link to={href} className="arrival-image-wrap">
          <img src={image} alt={product.name} />
        </Link>
      ) : (
        <div className="arrival-image-wrap">
          <img src={image} alt={product.name} />
        </div>
      )}
      <div className="arrival-card__meta">
        {href ? <Link to={href}>{title}</Link> : title}
        <div className="price-row">
          <span>{formatCurrency(product.selling_price)}</span>
          <button
            type="button"
            className="cart-mini"
            disabled={product.stock_quantity <= 0}
            onClick={() => onAdd?.(product)}
            aria-label={product.stock_quantity > 0 ? 'Add to cart' : 'Out of stock'}
          >
            <FaShoppingCart />
          </button>
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
