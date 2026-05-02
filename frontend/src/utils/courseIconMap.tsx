import React from 'react';
import {
  Landmark, Briefcase, Monitor, Palette, Scale, Pill, Activity,
  Stethoscope, Cpu, FlaskConical, ChartBar, Wrench, TestTube,
  Dna, BookOpen, GraduationCap, Link, Rocket, ScrollText,
} from 'lucide-react';

export const COURSE_ICON_MAP: Record<string, React.ReactNode> = {
  arch:     <Landmark size={22} />,
  biz:      <Briefcase size={22} />,
  cs:       <Monitor size={22} />,
  design:   <Palette size={22} />,
  law:      <Scale size={22} />,
  pharma:   <Pill size={22} />,
  physio:   <Activity size={22} />,
  nursing:  <Stethoscope size={22} />,
  eng:      <Cpu size={22} />,
  mba:      <ChartBar size={22} />,
  research: <FlaskConical size={22} />,
  diploma:  <Wrench size={22} />,
  lab:      <TestTube size={22} />,
  phd:      <Dna size={22} />,
  default:  <BookOpen size={22} />,
};

export const CAT_ICON_MAP: Record<string, React.ReactNode> = {
  all:        <BookOpen size={13} />,
  ug:         <GraduationCap size={13} />,
  pg:         <GraduationCap size={13} />,
  diploma:    <ScrollText size={13} />,
  integrated: <Link size={13} />,
  lateral:    <Rocket size={13} />,
};
