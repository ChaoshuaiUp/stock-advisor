// React Context + useReducer 全局状态管理
import React, { createContext, useContext, useReducer, type Dispatch } from 'react';
import type { AppState, AppAction, Stock, StockAnalysis } from '@/types';

const initialState: AppState = {
  stocks: [],
  selectedStock: null,
  analysisCache: {},
  compareList: [],
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_STOCKS':
      return { ...state, stocks: action.payload };

    case 'SELECT_STOCK':
      return { ...state, selectedStock: action.payload };

    case 'LOAD_ANALYSIS': {
      const { code, analysis } = action.payload;
      return {
        ...state,
        analysisCache: { ...state.analysisCache, [code]: analysis },
      };
    }

    case 'ADD_TO_COMPARE': {
      if (state.compareList.includes(action.payload) || state.compareList.length >= 4) {
        return state;
      }
      return { ...state, compareList: [...state.compareList, action.payload] };
    }

    case 'REMOVE_FROM_COMPARE':
      return {
        ...state,
        compareList: state.compareList.filter(c => c !== action.payload),
      };

    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: Dispatch<AppAction>;
}>({ state: initialState, dispatch: () => null });

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}

// 便捷 hooks
export function useStocks(): Stock[] {
  const { state } = useAppContext();
  return state.stocks;
}

export function useCompareList(): string[] {
  const { state } = useAppContext();
  return state.compareList;
}

export function useAnalysis(code: string): StockAnalysis | undefined {
  const { state } = useAppContext();
  return state.analysisCache[code];
}
