import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Product } from "@shared/schema";
import { AddToCartButton } from "@/components/ui/add-to-cart-button";
import { RatingDisplay } from "@/components/ui/rating-display";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Star, Leaf, Shield, Crown } from "lucide-react";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const hasDiscount = product.discountPrice && product.discountPrice < product.price;
  const displayPrice = hasDiscount ? product.discountPrice : product.price;

  // Fetch product reviews to calculate rating
  const { data: reviews = [] } = useQuery({
    queryKey: [`/api/products/${product.id}/reviews`],
    enabled: !!product.id,
  });

  // Calculate average rating from reviews
  const averageRating = reviews && Array.isArray(reviews) && reviews.length > 0 
    ? reviews.reduce((sum: number, review: any) => sum + review.rating, 0) / reviews.length 
    : 0;

  return (
    <motion.div 
      whileHover={{ y: -5 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="product-card bg-cream rounded-lg overflow-hidden shadow-md hover:shadow-xl transition duration-300 h-full">
        <Link href={`/products/${product.id}`}>
          <div className="relative overflow-hidden h-64">
            {hasDiscount && (
              <div className="absolute top-2 left-2 z-10">
                <Badge variant="destructive" className="bg-red-500 text-white">
                  {Math.round(((product.price - product.discountPrice!) / product.price) * 100)}% OFF
                </Badge>
              </div>
            )}
            <motion.img 
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.5 }}
              src={product.imageUrl.startsWith('http') ? product.imageUrl : `/api/images/serve/${product.imageUrl.replace(/^\/+/, '')}`} 
              onError={(e) => {
                e.currentTarget.src = '/api/images/placeholder.png';
              }}
              alt={product.name} 
              className="w-full h-full object-cover transition-transform duration-500"
            />
          </div>
        </Link>
        <CardContent className="p-5">
          <div className="flex justify-between items-start mb-2">
            <Link href={`/products/${product.id}`}>
              <h3 className="font-heading text-forest text-xl font-semibold hover:text-primary transition-colors">
                {product.name}
              </h3>
            </Link>
            <div className="flex flex-wrap gap-1">
              <span className="bg-secondary/20 text-secondary-dark px-2 py-1 rounded-full text-xs font-semibold">
                {product.category}
              </span>
              {product.subcategory && (
                <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-xs font-medium">
                  {product.subcategory}
                </span>
              )}
            </div>
          </div>

          {/* Product Attributes */}
          <div className="flex flex-wrap gap-1 mb-3">
            {product.naturallyGrown && (
              <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                <Leaf className="w-3 h-3 mr-1" />
                Natural
              </Badge>
            )}
            {product.chemicalFree && (
              <Badge variant="outline" className="text-blue-600 border-blue-600 text-xs">
                <Shield className="w-3 h-3 mr-1" />
                Chemical Free
              </Badge>
            )}
            {product.premiumQuality && (
              <Badge variant="outline" className="text-purple-600 border-purple-600 text-xs">
                <Crown className="w-3 h-3 mr-1" />
                Premium
              </Badge>
            )}
          </div>

          <p className="text-olive text-sm mb-3 line-clamp-2">
            {product.shortDescription || product.description}
          </p>

          {/* Rating Display */}
          <div className="mb-3">
            <RatingDisplay 
              rating={averageRating} 
              totalReviews={reviews.length} 
              size="sm"
              showCount={reviews.length > 0}
            />
          </div>

          {/* Stock Status */}
          {product.stockQuantity && product.stockQuantity <= 10 && (
            <p className="text-orange-600 text-xs mb-2 font-medium">
              Only {product.stockQuantity} left in stock!
            </p>
          )}

          <div className="flex items-center justify-between mt-4">
            <div className="flex flex-col">
              {hasDiscount ? (
                <div className="flex items-center gap-2">
                  <span className="text-forest font-bold text-lg">
                    ₹{displayPrice!.toFixed(2)}
                  </span>
                  <span className="text-gray-500 line-through text-sm">
                    ₹{product.price.toFixed(2)}
                  </span>
                </div>
              ) : (
                <span className="text-forest font-bold text-lg">
                  ₹{product.price.toFixed(2)}
                </span>
              )}
            </div>
            <AddToCartButton product={product} />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
