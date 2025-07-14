import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Product } from "@shared/schema";
import { AddToCartButton } from "@/components/ui/add-to-cart-button";
import { RatingDisplay } from "@/components/ui/rating-display";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Leaf, Shield, Crown } from "lucide-react";
import placeholderImage from "../../../public/uploads/products/No-Image.png";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const hasDiscount =
    product.discountPrice && product.discountPrice < product.price;
  const displayPrice = hasDiscount ? product.discountPrice : product.price;
  const lowStock = product.stockQuantity && product.stockQuantity <= 10;

  // Fetch product reviews to calculate rating
  const { data: reviews = [] } = useQuery({
    queryKey: [`/api/products/${product.id}/reviews`],
    enabled: !!product.id,
  });

  // Calculate average rating from reviews
  const averageRating =
    reviews && Array.isArray(reviews) && reviews.length > 0
      ? reviews.reduce((sum: number, review: any) => sum + review.rating, 0) /
        reviews.length
      : 0;

  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ duration: 0.3 }}
      className="h-full" // Ensure motion div takes full height
    >
      <Card className="flex flex-col h-full bg-cream rounded-lg overflow-hidden shadow-md hover:shadow-xl transition duration-300">
        {/* Image Section */}
        <Link href={`/products/${product.id}`} className="block">
          <div className="relative overflow-hidden aspect-square">
            {" "}
            {/* Changed to aspect-square */}
            {hasDiscount && (
              <div className="absolute top-2 left-2 z-10">
                <Badge variant="destructive" className="bg-red-500 text-white">
                  {Math.round(
                    ((product.price - product.discountPrice!) / product.price) *
                      100
                  )}
                  % OFF
                </Badge>
              </div>
            )}
            <motion.img
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.5 }}
              src={
                product.imageUrl.startsWith("http")
                  ? product.imageUrl
                  : `/api/images/serve/${product.imageUrl.replace(/^\/+/, "")}`
              }
              onError={(e) => {
                e.currentTarget.src = placeholderImage;
              }}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-500"
            />
          </div>
        </Link>

        {/* Content Section */}
        <CardContent className="p-4 md:p-5 flex flex-col flex-grow">
          {/* Title and Categories */}
          <div className="flex justify-between items-start mb-2 gap-2">
            <Link
              href={`/products/${product.id}`}
              className="hover:text-primary transition-colors flex-grow"
            >
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <h3 className="font-heading text-forest text-lg md:text-xl font-semibold line-clamp-2 cursor-default">
                      {product.name}
                    </h3>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    align="center"
                    className="max-w-[200px]"
                  >
                    <p className="text-sm">{product.name}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Link>
            <div className="flex flex-wrap gap-1 flex-shrink-0">
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
              <Badge
                variant="outline"
                className="text-green-600 border-green-600 text-xs"
              >
                <Leaf className="w-3 h-3 mr-1" />
                Natural
              </Badge>
            )}
            {product.chemicalFree && (
              <Badge
                variant="outline"
                className="text-blue-600 border-blue-600 text-xs"
              >
                <Shield className="w-3 h-3 mr-1" />
                Chemical Free
              </Badge>
            )}
            {product.premiumQuality && (
              <Badge
                variant="outline"
                className="text-purple-600 border-purple-600 text-xs"
              >
                <Crown className="w-3 h-3 mr-1" />
                Premium
              </Badge>
            )}
          </div>

          {/* Description with consistent height */}
          <p className="text-olive text-sm mb-3 line-clamp-2 min-h-[2.5rem]">
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
          {lowStock && (
            <p className="text-orange-600 text-xs mb-2 font-medium">
              Only {product.stockQuantity} left in stock!
            </p>
          )}

          {/* Price and Add to Cart - pushed to bottom */}
          <div className="flex items-center justify-between mt-auto pt-4">
            <div className="flex flex-col space-y-1">
              {hasDiscount ? (
                <>
                  <span className="text-forest font-bold text-lg md:text-xl">
                    ₹{displayPrice!.toFixed(2)}
                  </span>
                  <span className="text-gray-500 line-through text-sm">
                    Original: ₹{product.price.toFixed(2)}
                  </span>
                </>
              ) : (
                <span className="text-forest font-bold text-lg md:text-xl">
                  ₹{product.price.toFixed(2)}
                </span>
              )}
              {hasDiscount && (
                <span className="text-red-600 text-xs font-medium">
                  You save ₹{(product.price - displayPrice!).toFixed(2)} (
                  {Math.round(
                    ((product.price - displayPrice!) / product.price) * 100
                  )}
                  %)
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
