import React, { useMemo, useRef, useState } from 'react';
import { Dimensions, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { PrimaryButton } from '@/components/ui/primary-button';
import { FrontPageSlide } from '@/components/front-page/front-page-slide';
import { Fonts } from '@/constants/theme';

import Bg1 from '@/assets/images/front_page/1.svg';
import Img1 from '@/assets/images/front_page/1_img.svg';
import Bg2 from '@/assets/images/front_page/2.svg';
import Img2a from '@/assets/images/front_page/2a_img.svg';
import Img2b from '@/assets/images/front_page/2b_img.svg';
import Bg3 from '@/assets/images/front_page/3.svg';
import Img3 from '@/assets/images/front_page/3_img.svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    Background: Bg1,
    overlays: [
      {
        Svg: Img1,
        width: 236.09,
        height: 161.49,
        containerStyle: {
          top: 210,
          left: 75,
          borderRadius: 14,
          backgroundColor: '#FFFFFF',
          shadowColor: '#000000',
          shadowOpacity: 0.12,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
          elevation: 5,
        },
      },
    ],
  },
  {
    id: '2',
    Background: Bg2,
    overlays: [
      {
        Svg: Img2a,
        width: 242.39,
        height: 144.24,
        containerStyle: {
          top: 210,
          left: 75,
          shadowColor: '#000000',
          shadowOpacity: 0.12,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
          elevation: 5,
        },
      },
      {
        Svg: Img2b,
        width: 242.39,
        height: 59.48,
        containerStyle: {
          top: 364,
          left: 75,
          shadowColor: '#000000',
          shadowOpacity: 0.12,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
          elevation: 5,
        },
      },
    ],
  },
  {
    id: '3',
    Background: Bg3,
    overlays: [
      {
        Svg: Img3,
        width: 215.47,
        height: 220.77,
        containerStyle: {
          top: 196,
          left: 88,
          shadowColor: '#000000',
          shadowOpacity: 0.12,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
          elevation: 5,
        },
      },
    ],
  },
];

export default function FrontPage() {
  const flatListRef = useRef<FlatList<(typeof slides)[number]>>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const onMomentumEnd = useMemo(
    () => (event: any) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const nextIndex = Math.round(offsetX / SCREEN_WIDTH);
      setActiveIndex(nextIndex);
    },
    []
  );

  const jumpToSlide = (index: number) => {
    flatListRef.current?.scrollToIndex({ index, animated: true });
    setActiveIndex(index);
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" style="light" />

      <FlatList
        ref={flatListRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        data={slides}
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={onMomentumEnd}
        renderItem={({ item }) => (
          <View style={{ width: SCREEN_WIDTH }}>
            <FrontPageSlide
              Background={item.Background}
              overlays={item.overlays}
            />
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dotsRow}>
          {slides.map((slide, idx) => (
            <Pressable key={slide.id} onPress={() => jumpToSlide(idx)} style={styles.dotPress}>
              <View style={[styles.dot, idx === activeIndex ? styles.dotActive : styles.dotInactive]} />
            </Pressable>
          ))}
        </View>

        <PrimaryButton content="New User" width="100%" onPress={() => router.push('/signup')} />

        <Pressable onPress={() => router.push('/login')}>
          <Text style={styles.signIn}>Sign In</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  footer: {
    position: 'absolute',
    left: 22,
    right: 22,
    bottom: 42,
    alignItems: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    marginBottom: 22,
  },
  dotPress: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotActive: {
    backgroundColor: '#5F4BF5',
  },
  dotInactive: {
    backgroundColor: '#D4A7F5',
  },
  signIn: {
    marginTop: 18,
    fontFamily: Fonts.rounded,
    fontSize: 14,
    color: '#07004D',
  },
});
