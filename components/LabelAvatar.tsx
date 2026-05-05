import React from 'react';
import { Text, StyleProp, TextStyle, ViewStyle } from 'react-native';
import { Image } from 'expo-image';

/**
 * Renders a label avatar value — either a single emoji glyph (default) or
 * an image when the value is a `data:` / `http(s)://` URI. Lets every
 * avatar-display site stay agnostic to which kind it has.
 *
 * The parent owns sizing; this component just fills the wrapper for
 * images, or renders text with an emoji-sized font.
 */
export function isImageAvatar(avatar: string | null | undefined): boolean {
  if (!avatar) return false;
  return (
    avatar.startsWith('data:') ||
    avatar.startsWith('http://') ||
    avatar.startsWith('https://') ||
    avatar.startsWith('file://') ||
    avatar.startsWith('content://') ||
    avatar.startsWith('ph://')
  );
}

export interface LabelAvatarProps {
  avatar: string;
  /** Font size used when rendering an emoji. Image always fills its container. */
  emojiSize?: number;
  /** Image-mode size; defaults to filling the parent (use parent fixed dims). */
  imageSize?: number;
  imageStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function LabelAvatar({
  avatar,
  emojiSize = 24,
  imageSize,
  imageStyle,
  textStyle,
}: LabelAvatarProps): React.JSX.Element {
  if (isImageAvatar(avatar)) {
    const dim = imageSize !== undefined ? { width: imageSize, height: imageSize, borderRadius: imageSize / 2 } : null;
    return (
      <Image
        source={{ uri: avatar }}
        style={[{ width: '100%', height: '100%' }, dim, imageStyle]}
        contentFit="cover"
      />
    );
  }
  return <Text style={[{ fontSize: emojiSize }, textStyle]}>{avatar}</Text>;
}
