import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * 音声活動検知フックのオプション設定
 */
interface UseVoiceActivationOptions {
  /** 音量閾値 (0-1の範囲、デフォルト: 0.1) */
  threshold?: number;
  /** 音声終了と判定する無音時間 (ミリ秒、デフォルト: 500) */
  silentTime?: number;
  /** チェック間隔 (ミリ秒、デフォルト: 100) */
  checkInterval?: number;
}

/**
 * 音声活動検知フック
 * マイク入力を監視し、一定以上の音量が検知されたときにコールバックを実行
 * @param onVoiceDetected - 音声が検知されたときに呼び出されるコールバック関数
 * @param options - 音声検知の設定オプション
 * @returns 音声検知の状態と制御関数を含むオブジェクト
 */
export function useVoiceActivation(
  onVoiceDetected: () => void,
  options: UseVoiceActivationOptions = {}
) {
  const {
    threshold = 0.1,
    silentTime = 500,
    checkInterval = 100
  } = options;

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isListeningRef = useRef<boolean>(false);
  const lastVoiceTimeRef = useRef<number>(0);
  const [isMicAccessible, setIsMicAccessible] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);

  // マイクアクセスを要求
  const requestMicAccess = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      microphoneRef.current = stream;
      setIsMicAccessible(true);
      return stream;
    } catch (err) {
      console.error('マイクアクセスが拒否または利用できません:', err);
      setIsMicAccessible(false);
      throw err;
    }
  }, []);

  // 音声コンテキストを初期化
  const initAudioContext = useCallback(() => {
    if (!('AudioContext' in window || 'webkitAudioContext' in window)) {
      console.warn('このブラウザではAudio APIがサポートされていません');
      return false;
    }

    try {
      const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) {
        console.warn('AudioContext is not supported in this browser');
        return false;
      }
      audioContextRef.current = new AudioContext();
      
      // アナライザーノードを作成
      if (audioContextRef.current) {
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        analyserRef.current.smoothingTimeConstant = 0.8;
      } else {
        console.warn('Failed to create AudioContext');
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('AudioContextの初期化に失敗:', err);
      return false;
    }
  }, []);

  // 音声レベルをチェック
  const checkAudioLevel = useCallback(() => {
    if (!audioContextRef.current || !analyserRef.current || !microphoneRef.current) {
      return;
    }

    try {
      // マイク入力をアナライザーに接続（まだ接続していない場合）
      if (audioContextRef.current && microphoneRef.current) {
        const source = audioContextRef.current.createMediaStreamSource(microphoneRef.current);
        source.connect(analyserRef.current);
      } else {
        console.warn('AudioContext or microphone not available');
        return;
      }

      // 周波数データを取得
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteFrequencyData(dataArray);

      // 音量レベルを計算（0-255の範囲を0-1に正規化）
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const volume = sum / (bufferLength * 255);

      // 音量が閾値を超えたら音声検知と判定
      if (volume > threshold) {
        lastVoiceTimeRef.current = Date.now();
        if (!isListeningRef.current) {
          isListeningRef.current = true;
          setIsListening(true);
          onVoiceDetected();
        }
      } else {
        // 無音状態が継続したらリスニング状態をリセット
        const silentDuration = Date.now() - lastVoiceTimeRef.current;
        if (isListeningRef.current && silentDuration > silentTime) {
          isListeningRef.current = false;
          setIsListening(false);
        }
      }
    } catch (err) {
      console.error('音声レベルチェックエラー:', err);
    }
  }, [threshold, silentTime, onVoiceDetected]);

  // アニメーションフレームループを開始
  const startListening = useCallback(async () => {
    if (isListeningRef.current) return;

    try {
      // マイクアクセスを要求
      await requestMicAccess();
      
      // オーディオコンテキストを初期化
      if (!initAudioContext()) {
        throw new Error('AudioContext初期化失敗');
      }

      isListeningRef.current = true;
      setIsListening(true);
      
      // アニメーションフレームループを開始
      const loop = () => {
        checkAudioLevel();
        animationFrameRef.current = requestAnimationFrame(loop);
      };
      animationFrameRef.current = requestAnimationFrame(loop);
    } catch (err) {
      console.error('音声検知開始失敗:', err);
      isListeningRef.current = false;
      setIsListening(false);
      setIsMicAccessible(false);
    }
  }, [initAudioContext, requestMicAccess, checkAudioLevel]);

  // リスニングを停止
  const stopListening = useCallback(() => {
    // アニメーションフレームをキャンセル
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // オーディオコンテキストを閉じる
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (err) {
        console.error('AudioContext閉じるエラー:', err);
      }
      audioContextRef.current = null;
    }

    // アナライザーをクリア
    analyserRef.current = null;

    // マイクストリームを停止
    if (microphoneRef.current) {
      microphoneRef.current.getTracks().forEach(track => track.stop());
      microphoneRef.current = null;
    }

    isListeningRef.current = false;
    setIsListening(false);
    setIsMicAccessible(false);
  }, []);

  // エフェクト: マイクアクセス要求とクリーンアップ
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    isMicAccessible,
    isListening,
    startListening,
    stopListening
  };
}