'use client'
import { useInterfaceLanguage } from '@/components/InterfaceLanguage'
import { SHOWCASE_COPY } from '@/lib/showcaseCopy'
export default function ShowcaseLabel() { return <>{SHOWCASE_COPY[useInterfaceLanguage()].showcase}</> }
