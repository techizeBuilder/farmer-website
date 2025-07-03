import { useEffect } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { AddToCartButton } from "@/components/ui/add-to-cart-button";
import { RatingDisplay } from "@/components/ui/rating-display";
import { Separator } from "@/components/ui/separator";
import { MapPin, Leaf, Shield, Award, ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";
import { ParallaxSection } from "@/components/ui/parallax-section";
import { ProductGallery } from "@/components/ui/product-gallery";
import ProductCard from "@/components/ProductCard";
import ProductReviewSystem from "@/components/ProductReviewSystem";
import SocialShare from "@/components/SocialShare";
import { useAnimations } from "@/hooks/use-animations";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const productId = parseInt(id);
  
  // Animation controller
  const { setupScrollAnimation } = useAnimations();
  
  // Set up scroll animations
  useEffect(() => {
    setupScrollAnimation();
  }, [setupScrollAnimation]);

  // Get product data
  const { data: product, isLoading: isLoadingProduct } = useQuery<any>({
    queryKey: [`/api/products/${productId}`],
    enabled: !isNaN(productId)
  });

  // Get farmer data based on product's farmerId
  const { data: farmer, isLoading: isLoadingFarmer } = useQuery<any>({
    queryKey: [`/api/farmers/${product?.farmerId}`],
    enabled: !!product?.farmerId
  });

  // Get product reviews for rating display
  const { data: reviews = [] } = useQuery({
    queryKey: [`/api/products/${productId}/reviews`],
    enabled: !isNaN(productId)
  });

  // Calculate average rating from reviews
  const averageRating = reviews && Array.isArray(reviews) && reviews.length > 0 
    ? reviews.reduce((sum: number, review: any) => sum + review.rating, 0) / reviews.length 
    : 0;

  // Get related products (same category)
  const { data: relatedProducts = [] } = useQuery<any[]>({
    queryKey: [`/api/products/category/${product?.category}`],
    enabled: !!product?.category
  });

  // Filter out the current product from related products and limit to 4
  const filteredRelatedProducts = relatedProducts
    .filter((p: any) => p.id !== productId)
    .slice(0, 4);

  if (isLoadingProduct || isLoadingFarmer) {
    return (
      <div className="container mx-auto px-4 py-16 flex justify-center items-center min-h-screen">
        <div className="animate-pulse flex flex-col items-center space-y-4">
          <div className="h-12 w-48 bg-muted rounded"></div>
          <div className="h-64 w-full max-w-md bg-muted rounded"></div>
          <div className="h-4 w-3/4 bg-muted rounded"></div>
          <div className="h-4 w-1/2 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-4">Product Not Found</h1>
        <p className="text-muted-foreground mb-8">The product you're looking for doesn't exist or has been removed.</p>
        <Link href="/products">
          <Button>View All Products</Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Product Detail Section */}
      <section className="pt-32 pb-16 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <Link href="/products">
            <Button variant="ghost" className="mb-6 flex items-center text-muted-foreground">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Products
            </Button>
          </Link>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Product Gallery */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              {/* Use our new ProductGallery component with enhanced product data */}
              <ProductGallery 
                mainImage={product?.imageUrl || "https://images.unsplash.com/photo-1611854779393-1b2da9d400fe?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"}
                additionalImages={product?.imageUrls || []}
                videoUrl={product?.videoUrl}
                productName={product?.name || "Product"}
              />
            </motion.div>
            
            {/* Product Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <span className="bg-secondary/20 text-secondary-dark px-3 py-1 rounded-full text-sm font-semibold">
                {product?.category || "Product"}
              </span>
              <h1 className="font-heading text-forest text-3xl md:text-4xl font-bold mt-3 mb-4">
                {product?.name || "Product Name"}
              </h1>

              {/* Rating Display */}
              <div className="mb-4">
                <RatingDisplay 
                  rating={averageRating} 
                  totalReviews={reviews.length} 
                  size="md"
                  showCount={true}
                />
              </div>

              <p className="text-olive text-lg mb-6">
                {product?.description || "This premium product is grown using traditional methods by our partner farmers, ensuring exceptional quality and authentic flavor."}
              </p>
              
              <div className="flex flex-wrap items-center gap-4 mb-6">
                {product?.naturallyGrown && (
                  <div className="flex items-center text-sm text-olive">
                    <Leaf className="text-primary mr-2 h-4 w-4" />
                    <span>Naturally Grown</span>
                  </div>
                )}
                {product?.chemicalFree && (
                  <div className="flex items-center text-sm text-olive">
                    <Shield className="text-primary mr-2 h-4 w-4" />
                    <span>Chemical-Free</span>
                  </div>
                )}
                {product?.premiumQuality && (
                  <div className="flex items-center text-sm text-olive">
                    <Award className="text-primary mr-2 h-4 w-4" />
                    <span>Premium Quality</span>
                  </div>
                )}
              </div>
              
              {/* Stock Status */}
              {product?.stockQuantity && product.stockQuantity <= 10 && (
                <div className="bg-orange-100 border border-orange-300 text-orange-800 px-3 py-2 rounded-md mb-4">
                  <p className="text-sm font-medium">
                    Only {product.stockQuantity} left in stock!
                  </p>
                </div>
              )}
              
              <div className="flex items-center space-x-4 mb-8">
                {product?.discountPrice && product.discountPrice < product.price ? (
                  <div className="flex items-center space-x-3">
                    <span className="text-forest text-3xl font-bold">
                      ₹{product.discountPrice.toFixed(2)}
                    </span>
                    <span className="text-gray-500 line-through text-xl">
                      ₹{product.price.toFixed(2)}
                    </span>
                    <span className="bg-red-500 text-white px-2 py-1 rounded text-sm font-semibold">
                      {Math.round(((product.price - product.discountPrice) / product.price) * 100)}% OFF
                    </span>
                  </div>
                ) : (
                  <span className="text-forest text-3xl font-bold">
                    ₹{product?.price ? product.price.toFixed(2) : "0.00"}
                  </span>
                )}
                <div className="text-sm text-olive bg-background/80 px-3 py-1 rounded">
                  In Stock: {product?.stockQuantity || 0}
                </div>
              </div>
              
              <div className="mb-8">
                {product && (
                  <AddToCartButton 
                    product={product} 
                    showIcon={true} 
                    fullWidth 
                    showQuantitySelector={true}
                    max={product.stockQuantity}
                  />
                )}
              </div>
              
              {farmer && (
                <div className="bg-muted p-4 rounded-lg mb-6">
                  <h3 className="font-heading text-forest text-lg font-bold mb-2">
                    Grown by {farmer.name}
                  </h3>
                  <div className="flex items-center text-sm text-olive mb-3">
                    <MapPin className="text-secondary mr-2 h-4 w-4" />
                    <span>{farmer.location}</span>
                  </div>
                  <p className="text-olive text-sm italic">
                    "{farmer.story && farmer.story.length > 120 
                      ? `${farmer.story.substring(0, 120)}...` 
                      : farmer.story}"
                  </p>
                  <Link href={`/farmers`}>
                    <Button variant="link" className="p-0 h-auto text-primary mt-2">
                      Learn more about our farmers
                    </Button>
                  </Link>
                </div>
              )}

              {/* Social Media Sharing */}
              {product && (
                <div className="border-t pt-6">
                  <SocialShare
                    url={`${window.location.origin}/products/${product.id}`}
                    title={`Check out ${product.name} from Farm to Table`}
                    description={product.description}
                    imageUrl={product.imageUrl}
                  />
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Product Journey Section */}
      <ParallaxSection 
        backgroundUrl="https://images.unsplash.com/photo-1464226184884-fa280b87c399?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=1080"
        className="py-20"
      >
        <div className="container mx-auto px-4 text-center">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="font-heading text-white text-3xl md:text-4xl font-bold mb-6 text-shadow"
          >
            The Journey Behind Each {product?.name || "Product"}
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-cream text-lg max-w-3xl mx-auto text-shadow"
          >
            Our {product?.name || "product"} is meticulously grown using traditional methods that have been passed down through generations. 
            Each {product?.category ? product.category.toLowerCase() : "product"} is carefully harvested at the peak of ripeness to ensure maximum flavor and nutrition.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-10"
          >
            <Button 
              className="bg-secondary hover:bg-secondary/90 text-white"
              size="lg"
            >
              Watch Our Story
            </Button>
          </motion.div>
        </div>
      </ParallaxSection>
      
      {/* Product Benefits */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 lg:px-8">
          <h2 className="font-heading text-forest text-3xl font-bold mb-12 text-center">
            Benefits & Features
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 scroll-animation">
            <div className="text-center">
              <div className="w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Leaf className="text-secondary text-2xl" />
              </div>
              <h3 className="font-heading text-forest text-xl font-semibold mb-3">Naturally Grown</h3>
              <p className="text-olive">
                Cultivated without chemical pesticides or fertilizers, allowing for authentic flavor development and maximum nutrition.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="text-secondary text-2xl" />
              </div>
              <h3 className="font-heading text-forest text-xl font-semibold mb-3">Pure & Unprocessed</h3>
              <p className="text-olive">
                Minimally processed to preserve natural compounds and nutrients that industrial processing often strips away.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="text-secondary text-2xl" />
              </div>
              <h3 className="font-heading text-forest text-xl font-semibold mb-3">Superior Quality</h3>
              <p className="text-olive">
                Carefully selected for size, color, and ripeness, ensuring you receive only the best from each harvest.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Product Reviews Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 lg:px-8">
          <h2 className="font-heading text-forest text-3xl font-bold mb-8 text-center">
            Customer Reviews
          </h2>
          
          <ProductReviewSystem productId={productId} />
        </div>
      </section>
      
      {/* Related Products */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <h2 className="font-heading text-forest text-3xl font-bold mb-8 text-center">
            You Might Also Like
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {filteredRelatedProducts.length > 0 ? (
              filteredRelatedProducts.map((relatedProduct: any) => (
                <div key={relatedProduct.id} className="scroll-animation">
                  <ProductCard product={relatedProduct} />
                </div>
              ))
            ) : (
              <div className="col-span-4 text-center py-8">
                <p className="text-muted-foreground italic">Loading related products...</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
