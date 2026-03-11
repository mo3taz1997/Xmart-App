"use no memo";
import React from "react";
import { View, Text, FlatList, Pressable, Dimensions, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";

const { width } = Dimensions.get("window");

interface Props {
  section: any;
  language: string;
  colors: any;
  isDark: boolean;
  isRTL: boolean;
}

const IS_TABLET = width >= 768;
const ITEM_GAP = 12;
const CARD_W = width - 32;
const CARD_H = Math.round(CARD_W * 0.66);
const SNAP = CARD_W + ITEM_GAP;

export default function ProductSliderSection({ section, language, colors, isDark, isRTL }: Props) {
  const products: any[] = section.featuredProducts || [];
  const sectionTitle = (language === "ar" ? section.titleAr : section.titleEn) || "";

  const [current, setCurrent] = React.useState(0);
  const currentRef = React.useRef(0);
  const countRef = React.useRef(products.length);
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const flatRef = React.useRef<any>(null);
  const isUserScrolling = React.useRef(false);

  countRef.current = products.length;

  const startInterval = React.useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (countRef.current < 2) return;
    intervalRef.current = setInterval(() => {
      if (isUserScrolling.current) return;
      const next = (currentRef.current + 1) % countRef.current;
      currentRef.current = next;
      setCurrent(next);
      try { flatRef.current?.scrollToIndex({ index: next, animated: true }); } catch {}
    }, 4000);
  }, []);

  React.useEffect(() => {
    startInterval();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  if (products.length === 0) return null;

  const goTo = (idx: number) => {
    const clamped = Math.max(0, Math.min(idx, countRef.current - 1));
    currentRef.current = clamped;
    setCurrent(clamped);
    try { flatRef.current?.scrollToIndex({ index: clamped, animated: true }); } catch {}
    startInterval();
  };

  const BG = isDark ? "#1a2535" : "#ffffff";
  const IMG_BG = "#FFFFFF";

  return (
    <View style={{ marginTop: 16 }}>
      {!!sectionTitle && (
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 8, marginHorizontal: 16, marginBottom: 10 }}>
          <View style={{ width: 4, height: 20, borderRadius: 2, backgroundColor: colors.primary }} />
          <Text style={{ fontFamily: "Cairo_700Bold", fontSize: 18, color: colors.text, flex: 1, textAlign: isRTL ? "right" : "left" }}>
            {sectionTitle}
          </Text>
        </View>
      )}

      <FlatList
        ref={flatRef}
        data={products}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item: any, i: number) => item.handle || String(i)}
        windowSize={5}
        maxToRenderPerBatch={3}
        removeClippedSubviews={false}
        onScrollBeginDrag={() => { isUserScrolling.current = true; }}
        onMomentumScrollEnd={(e: any) => {
          isUserScrolling.current = false;
          const idx = Math.round(e.nativeEvent.contentOffset.x / SNAP);
          const clamped = Math.max(0, Math.min(idx, countRef.current - 1));
          currentRef.current = clamped;
          setCurrent(clamped);
          startInterval();
        }}
        onScrollEndDrag={(e: any) => {
          isUserScrolling.current = false;
          const idx = Math.round(e.nativeEvent.contentOffset.x / SNAP);
          const clamped = Math.max(0, Math.min(idx, countRef.current - 1));
          currentRef.current = clamped;
          setCurrent(clamped);
        }}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        getItemLayout={(_: any, i: number) => ({ length: SNAP, offset: SNAP * i, index: i })}
        snapToOffsets={products.map((_: any, i: number) => i * SNAP)}
        decelerationRate={0.92}
        ItemSeparatorComponent={() => <View style={{ width: ITEM_GAP }} />}
        renderItem={({ item: p }: { item: any }) => {
          const now = parseFloat(p.price || "0");
          const orig = p.compareAtPrice ? parseFloat(p.compareAtPrice) : 0;
          const pct = orig > now ? Math.round((1 - now / orig) * 100) : 0;
          const priceStr = `${now % 1 === 0 ? now.toFixed(0) : now.toFixed(2)} ${p.currency || "JOD"}`;

          const brand: string = p.vendor || "";

          const title: string = (language === "ar"
            ? (p.customTitleAr || p.titleAr)
            : (p.customTitleEn || p.titleEn)) || "";

          const subtitle: string = language === "ar"
            ? (p.subtitleAr || p.descriptionAr || "")
            : (p.subtitleEn || p.description || "");

          const shopNowLabel = language === "ar" ? "اشتري الآن" : "Shop Now";

          const navigateToProduct = () => {
            if (p.handle) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push({ pathname: "/product/[handle]", params: { handle: p.handle } });
            }
          };

          return (
            <Pressable
              onPress={navigateToProduct}
              style={{
                width: CARD_W,
                height: CARD_H,
                borderRadius: 20,
                overflow: "hidden",
                backgroundColor: BG,
                flexDirection: isRTL ? "row" : "row-reverse",
              }}
            >
              <View style={{ width: CARD_W * 0.56, height: CARD_H, backgroundColor: IMG_BG }}>
                {(p.customImageUrl || p.imageUrl) ? (
                  <Image
                    source={{ uri: p.customImageUrl || p.imageUrl }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="contain"
                    transition={200}
                    cachePolicy="memory-disk"
                    recyclingKey={p.handle || p.imageUrl}
                  />
                ) : null}
              </View>

              <View style={{
                flex: 1,
                height: CARD_H,
                paddingHorizontal: 12,
                paddingTop: 12,
                paddingBottom: 10,
                justifyContent: "flex-start",
              }}>
                {!!brand && (
                  <Text numberOfLines={1} style={{
                    fontFamily: "Cairo_400Regular",
                    fontSize: 10,
                    color: isDark ? "#99aacc" : "#666",
                    letterSpacing: 0.6,
                    marginBottom: 1,
                    textAlign: isRTL ? "right" : "left",
                    textTransform: "uppercase",
                  }}>
                    {brand}
                  </Text>
                )}

                <Text
                  numberOfLines={2}
                  style={{
                    fontFamily: "Cairo_700Bold",
                    fontSize: 13,
                    color: isDark ? "#ffffff" : "#0f2240",
                    lineHeight: 18,
                    textAlign: isRTL ? "right" : "left",
                    marginBottom: 2,
                  }}
                >
                  {title}
                </Text>

                {!!subtitle && (
                  <Text
                    numberOfLines={1}
                    style={{
                      fontFamily: "Cairo_400Regular",
                      fontSize: 10,
                      color: isDark ? "#aabbd0" : "#5a6e85",
                      textAlign: isRTL ? "right" : "left",
                      marginBottom: 4,
                      lineHeight: 14,
                    }}
                  >
                    {subtitle}
                  </Text>
                )}

                <View style={{ flex: 1 }} />

                <View style={{ marginBottom: 6 }}>
                  {pct > 0 && (
                    <Text style={{
                      fontFamily: "Cairo_400Regular",
                      fontSize: 10,
                      color: isDark ? "#99aacc" : "#777",
                      textAlign: isRTL ? "right" : "left",
                    }}>
                      {language === "ar" ? "السعر الآن" : "Now"}
                    </Text>
                  )}
                  <Text style={{
                    fontFamily: "Cairo_700Bold",
                    fontSize: 14,
                    color: isDark ? "#248CCC" : "#163259",
                    textAlign: isRTL ? "right" : "left",
                  }}>
                    {priceStr}
                  </Text>
                  {pct > 0 && (
                    <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 4, marginTop: 1 }}>
                      <Text style={{ fontFamily: "Cairo_400Regular", fontSize: 9, color: "#999", textDecorationLine: "line-through" }}>
                        {parseFloat(p.compareAtPrice).toFixed(2)}
                      </Text>
                      <View style={{ backgroundColor: "#163259", borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 }}>
                        <Text style={{ color: "#fff", fontFamily: "Cairo_700Bold", fontSize: 8 }}>-{pct}%</Text>
                      </View>
                    </View>
                  )}
                </View>

                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    if (p.handle) router.push({ pathname: "/product/[handle]", params: { handle: p.handle } });
                  }}
                  style={({ pressed }: { pressed: boolean }) => ({
                    backgroundColor: "#D4F000",
                    borderRadius: 30,
                    paddingVertical: 6,
                    paddingHorizontal: 12,
                    alignSelf: isRTL ? "flex-end" : "flex-start",
                    opacity: pressed ? 0.8 : 1,
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  })}
                >
                  <Text style={{ fontFamily: "Cairo_700Bold", fontSize: 11, color: "#111" }}>
                    {shopNowLabel}
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          );
        }}
      />

      {products.length > 1 && (
        <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 12 }}>
          <TouchableOpacity
            onPress={() => goTo(current - 1)}
            disabled={current === 0}
            style={{ opacity: current === 0 ? 0.3 : 0.7, padding: 4 }}
          >
            <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={18} color={colors.text} />
          </TouchableOpacity>

          {products.map((_: any, i: number) => (
            <Pressable
              key={i}
              onPress={() => goTo(i)}
              style={{
                width: i === current ? 22 : 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: i === current
                  ? colors.primary
                  : isDark ? "rgba(255,255,255,0.25)" : "rgba(22,50,89,0.2)",
              }}
            />
          ))}

          <TouchableOpacity
            onPress={() => goTo(current + 1)}
            disabled={current === products.length - 1}
            style={{ opacity: current === products.length - 1 ? 0.3 : 0.7, padding: 4 }}
          >
            <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={18} color={colors.text} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
