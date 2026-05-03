import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile, NutritionalTargets, UserTargetCalculator } from './calculator';
import { format } from 'date-fns';

export interface DietEntry {
  id: string;
  name: string;
  calories: number; // calculated total for the amount Eaten
  protein: number;
  carbs: number;
  fat: number;
  amountEaten: number; 
  timestamp: number;
  mealType?: string;
}

export interface DailyLog {
  date: string; // YYYY-MM-DD
  entries: DietEntry[];
}

export interface BodyLog {
  date: string;
  weight: number;
  height: number;
  bodyFat?: number;
  bmi?: number;
  leanBodyMass?: number;
}

export interface CustomFood {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  unit: string;
  baseGrams: number;
}

export interface CustomTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface DietContextType {
  userProfile: UserProfile | null;
  targets: NutritionalTargets | null;
  customTargets: CustomTargets | null;
  dailyLogs: Record<string, DailyLog>;
  bodyLogs: Record<string, BodyLog>;
  customFoods: CustomFood[];
  currentDate: string;
  saveProfile: (profile: UserProfile) => void;
  saveCustomTargets: (targets: CustomTargets | null) => void;
  addEntry: (entry: Omit<DietEntry, 'id' | 'timestamp'>, targetDate?: string) => void;
  removeEntry: (id: string, targetDate?: string) => void;
  updateEntry: (id: string, updatedEntry: Partial<Omit<DietEntry, 'id' | 'timestamp'>>, targetDate?: string) => void;
  setDate: (date: string) => void;
  addBodyLog: (date: string, weight: number, height: number, bodyFat?: number) => void;
  addCustomFood: (food: Omit<CustomFood, 'id'>) => void;
}

const DietContext = createContext<DietContextType | undefined>(undefined);

export const DietProvider = ({ children }: { children: ReactNode }) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [targets, setTargets] = useState<NutritionalTargets | null>(null);
  const [customTargets, setCustomTargets] = useState<CustomTargets | null>(null);
  const [dailyLogs, setDailyLogs] = useState<Record<string, DailyLog>>({});
  const [bodyLogs, setBodyLogs] = useState<Record<string, BodyLog>>({});
  const [customFoods, setCustomFoods] = useState<CustomFood[]>([]);
  const [currentDate, setCurrentDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [isLoading, setIsLoading] = useState(true);

  // 初始化：從後端 API 讀取資料
  useEffect(() => {
    fetch('http://localhost:3001/api/user-data')
      .then(res => res.json())
      .then(data => {
        if (data.profile) setUserProfile(data.profile);
        if (data.customTargets) setCustomTargets(data.customTargets);
        if (data.dailyLogs) setDailyLogs(data.dailyLogs);
        if (data.bodyLogs) setBodyLogs(data.bodyLogs);
        if (data.customFoods) setCustomFoods(data.customFoods);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Failed to load data from API, falling back to localStorage", err);
        // Fallback to localStorage
        const savedProfile = localStorage.getItem('diet_profile');
        const savedCustomTargets = localStorage.getItem('custom_targets');
        const savedLogs = localStorage.getItem('diet_logs');
        const savedBody = localStorage.getItem('body_logs');
        const savedCustom = localStorage.getItem('custom_foods');
        
        if (savedProfile) setUserProfile(JSON.parse(savedProfile));
        if (savedCustomTargets) setCustomTargets(JSON.parse(savedCustomTargets));
        if (savedLogs) setDailyLogs(JSON.parse(savedLogs));
        if (savedBody) setBodyLogs(JSON.parse(savedBody));
        if (savedCustom) setCustomFoods(JSON.parse(savedCustom));
        setIsLoading(false);
      });
  }, []);

  // 更新 Target
  useEffect(() => {
    if (customTargets) {
      // 優先使用自定義目標
      setTargets({
        summary: {
          bmi: userProfile ? parseFloat((userProfile.weight / ((userProfile.height / 100) ** 2)).toFixed(1)) : 0,
          bmiLabel: '自定義目標',
          targetCalories: customTargets.calories,
        },
        macros: {
          protein: { g: customTargets.protein, kcal: customTargets.protein * 4 },
          carbohydrate: { g: customTargets.carbs, kcal: customTargets.carbs * 4 },
          fat: { g: customTargets.fat, kcal: customTargets.fat * 9 },
        },
        activityLevel: userProfile?.activityLevel || 'moderate',
      });
    } else if (userProfile) {
      // 否則自動計算
      setTargets(UserTargetCalculator.calculate(userProfile));
    }
  }, [userProfile, customTargets]);

  // 同步回傳給後端與 localStorage (做為雙保險)
  useEffect(() => {
    if (isLoading) return;

    const allData = {
      profile: userProfile,
      customTargets,
      dailyLogs,
      bodyLogs,
      customFoods
    };

    localStorage.setItem('diet_profile', JSON.stringify(userProfile));
    localStorage.setItem('custom_targets', JSON.stringify(customTargets));
    localStorage.setItem('diet_logs', JSON.stringify(dailyLogs));
    localStorage.setItem('body_logs', JSON.stringify(bodyLogs));
    localStorage.setItem('custom_foods', JSON.stringify(customFoods));

    fetch('http://localhost:3001/api/user-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(allData)
    }).catch(err => console.error("Sync to API failed", err));

  }, [userProfile, customTargets, dailyLogs, bodyLogs, customFoods, isLoading]);

  const saveProfile = (profile: UserProfile) => {
    setUserProfile(profile);
  };

  const saveCustomTargets = (targets: CustomTargets | null) => {
    setCustomTargets(targets);
  };

  const addEntry = (entryRaw: Omit<DietEntry, 'id' | 'timestamp'>, targetDate?: string) => {
    const entry: DietEntry = {
      ...entryRaw,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
    };
    
    const logDate = targetDate || currentDate;
    
    setDailyLogs(prev => {
      const todayLog = prev[logDate] || { date: logDate, entries: [] };
      return {
        ...prev,
        [logDate]: {
          ...todayLog,
          entries: [...todayLog.entries, entry]
        }
      };
    });

    if (targetDate && targetDate !== currentDate) {
      setCurrentDate(targetDate);
    }
  };

  const removeEntry = (id: string, targetDate?: string) => {
    const logDate = targetDate || currentDate;
    setDailyLogs(prev => {
      const dayLog = prev[logDate];
      if (!dayLog) return prev;
      return {
        ...prev,
        [logDate]: {
          ...dayLog,
          entries: dayLog.entries.filter(e => e.id !== id)
        }
      };
    });
  };

  const updateEntry = (id: string, updatedData: Partial<Omit<DietEntry, 'id' | 'timestamp'>>, targetDate?: string) => {
    const logDate = targetDate || currentDate;
    setDailyLogs(prev => {
      const dayLog = prev[logDate];
      if (!dayLog) return prev;
      return {
        ...prev,
        [logDate]: {
          ...dayLog,
          entries: dayLog.entries.map(e => e.id === id ? { ...e, ...updatedData } : e)
        }
      };
    });
  };

  const setDate = (date: string) => {
    setCurrentDate(date);
  };

  const addBodyLog = (date: string, weight: number, height: number, bodyFat?: number) => {
    const bmi = parseFloat((weight / ((height / 100) ** 2)).toFixed(1));
    const leanBodyMass = bodyFat ? parseFloat((weight * (1 - bodyFat / 100)).toFixed(1)) : undefined;

    setBodyLogs(prev => ({
      ...prev,
      [date]: { date, weight, height, bodyFat, bmi, leanBodyMass }
    }));
    
    // 同步更新當前 Profile 中的體重（如果是今天或最新的）
    if (userProfile && date === currentDate) {
      setUserProfile(prev => prev ? { ...prev, weight, height } : prev);
    }
  };

  const addCustomFood = (food: Omit<CustomFood, 'id'>) => {
    const newFood = { ...food, id: 'c_' + Math.random().toString(36).substring(2, 9) };
    setCustomFoods(prev => [...prev, newFood]);
  };

  return (
    <DietContext.Provider value={{ 
      userProfile, targets, customTargets, dailyLogs, bodyLogs, customFoods, currentDate, 
      saveProfile, saveCustomTargets, addEntry, removeEntry, updateEntry, setDate, addBodyLog, addCustomFood 
    }}>
      {children}
    </DietContext.Provider>
  );
};

export const useDiet = () => {
  const context = useContext(DietContext);
  if (!context) throw new Error("useDiet must be used within a DietProvider");
  return context;
};
