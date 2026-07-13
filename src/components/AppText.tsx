import {
  Text as RNText, TextInput as RNTextInput,
  StyleSheet, TextProps, TextInputProps, TextStyle,
} from 'react-native';

const FONT_BY_WEIGHT: Record<string, string> = {
  '100': 'Inter_400Regular', '200': 'Inter_400Regular', '300': 'Inter_400Regular',
  normal: 'Inter_400Regular', '400': 'Inter_400Regular',
  '500': 'Inter_600SemiBold', '600': 'Inter_600SemiBold',
  bold: 'Inter_700Bold', '700': 'Inter_700Bold',
  '800': 'Inter_800ExtraBold',
  '900': 'Inter_900Black',
};

function resolveFontFamily(style: TextProps['style']) {
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  const weight = String(flat?.fontWeight ?? '400');
  return FONT_BY_WEIGHT[weight] ?? FONT_BY_WEIGHT['400'];
}

export function Text({ style, ...props }: TextProps) {
  return <RNText {...props} style={[style, { fontFamily: resolveFontFamily(style), fontWeight: undefined }]} />;
}

export function TextInput({ style, ...props }: TextInputProps) {
  return <RNTextInput {...props} style={[style, { fontFamily: resolveFontFamily(style), fontWeight: undefined }]} />;
}
