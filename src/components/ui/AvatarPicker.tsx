import { useState, useCallback, ChangeEvent } from 'react';
import Cropper from 'react-easy-crop';
import { getCroppedImg, PixelCrop } from '@/utils/cropImage';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import { Smile, Image as ImageIcon, Upload, ZoomIn, Check, Trash2 } from 'lucide-react';
import { cn } from '@/utils/cn';

const DEFAULT_EMOJIS = [
  '🍁', '🗡️', '🏹', '🧙‍♂️', '🦹', '🐱', '🐶', '🦊', '🐻', '🐼',
  '🦁', '🐯', '🐰', '🐸', '🦄', '🐲', '🍄', '⭐', '🔥', '💧',
  '⚡', '❄️', '🌸', '👑', '🛡️', '⚔️', '💎', '🎮', '🍕', '🍰',
];

interface AvatarPickerProps {
  avatarEmoji?: string;
  avatarImage?: string;
  onChangeEmoji: (emoji: string) => void;
  onChangeImage: (imageUrl?: string) => void;
  className?: string;
}

export function AvatarPicker({
  avatarEmoji = '🍁',
  avatarImage,
  onChangeEmoji,
  onChangeImage,
  className,
}: AvatarPickerProps) {
  const [activeTab, setActiveTab] = useState<string>(avatarImage ? 'image' : 'emoji');
  const [customEmojiInput, setCustomEmojiInput] = useState('');

  // 裁切視窗狀態
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<PixelCrop | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: PixelCrop) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('請選取有效的圖片檔案 (PNG, JPG, WebP)！');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setRawImageSrc(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setIsCropModalOpen(true);
    };
    reader.readAsDataURL(file);
    // 重置 input 以便能重複選取同一檔案
    e.target.value = '';
  };

  const handleConfirmCrop = async () => {
    if (!rawImageSrc || !croppedAreaPixels) return;

    setIsProcessing(true);
    try {
      const croppedBase64 = await getCroppedImg(rawImageSrc, croppedAreaPixels, 128);
      onChangeImage(croppedBase64);
      setIsCropModalOpen(false);
      setRawImageSrc(null);
    } catch (err) {
      console.error('裁切圖片失敗:', err);
      alert('裁切圖片發生錯誤，請重試！');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCustomEmojiAdd = () => {
    const clean = customEmojiInput.trim();
    if (!clean) return;
    onChangeEmoji(clean);
    onChangeImage(undefined);
    setCustomEmojiInput('');
  };

  return (
    <div className={cn('space-y-3', className)}>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="emoji">
            <Smile className="w-3.5 h-3.5" />
            <span>Emoji 表情</span>
          </TabsTrigger>
          <TabsTrigger value="image">
            <ImageIcon className="w-3.5 h-3.5" />
            <span>自訂上傳照片</span>
          </TabsTrigger>
        </TabsList>

        {/* 頁籤 A：選擇 Emoji */}
        <TabsContent value="emoji">
          <div className="space-y-2.5 pt-1">
            <div className="grid grid-cols-6 sm:grid-cols-10 gap-1.5 p-2 bg-black/5 dark:bg-black/30 rounded-2xl border-2 border-[#D4B982]/60 dark:border-slate-700 max-h-36 overflow-y-auto">
              {DEFAULT_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    onChangeEmoji(emoji);
                    onChangeImage(undefined);
                  }}
                  className={cn(
                    'w-8 h-8 rounded-xl flex items-center justify-center text-base transition-transform active:scale-95 border-2 cursor-pointer',
                    !avatarImage && avatarEmoji === emoji
                      ? 'border-amber-500 bg-amber-500/20 shadow-sm scale-110'
                      : 'border-transparent hover:bg-black/10'
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={customEmojiInput}
                onChange={(e) => setCustomEmojiInput(e.target.value)}
                placeholder="輸入自訂符號或文字 (如 🦊)"
                className="flex-1 px-3 py-1.5 text-xs rounded-xl border-2 border-[#D4B982] dark:border-slate-700 bg-[#FFFDF9] dark:bg-slate-900 text-[#3E2F20] dark:text-slate-100 font-bold focus:outline-none focus:border-amber-500 shadow-inner"
                maxLength={4}
              />
              <Button
                type="button"
                variant="gold"
                size="sm"
                onClick={handleCustomEmojiAdd}
                className="h-8 text-xs shrink-0"
              >
                套用
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* 頁籤 B：自訂上傳照片與裁切 */}
        <TabsContent value="image">
          <div className="p-3 bg-black/5 dark:bg-black/30 rounded-2xl border-2 border-[#D4B982]/60 dark:border-slate-700 space-y-3 pt-2">
            <div className="flex items-center gap-3">
              {/* 目前頭像預覽 */}
              <div className="w-14 h-14 rounded-2xl bg-amber-400/20 border-2 border-amber-500 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                {avatarImage ? (
                  <img
                    src={avatarImage}
                    alt="自訂頭像"
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <span className="text-2xl">{avatarEmoji || '👤'}</span>
                )}
              </div>

              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="text-xs font-black text-[#3E2F20] dark:text-slate-100">
                  {avatarImage ? '✨ 已設定自訂圖片頭像' : '尚未設定自訂圖片'}
                </div>
                <div className="text-[11px] text-stone-500 dark:text-slate-400">
                  支援 JPG, PNG, WebP 格式，上傳後可手動縮放與圓形裁切。
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <label className="flex-1 cursor-pointer">
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="inline-flex items-center justify-center w-full px-3 py-2 text-xs font-bold rounded-xl border-2 border-dashed border-amber-500/80 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-300 transition-colors gap-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{avatarImage ? '更換新相片並裁切' : '選擇照片並裁切頭像'}</span>
                </div>
              </label>

              {avatarImage && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onChangeImage(undefined);
                    setActiveTab('emoji');
                  }}
                  className="text-red-500 hover:bg-red-500/10 h-8 text-xs shrink-0"
                  title="清除自訂照片，改回使用 Emoji"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  <span>改回 Emoji</span>
                </Button>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* 圓形裁切互動 Modal */}
      <Dialog open={isCropModalOpen} onOpenChange={(open) => !open && setIsCropModalOpen(false)}>
        <DialogContent maxWidthClass="max-w-md">
          <DialogHeader>
            <DialogTitle>
              <ImageIcon className="w-5 h-5 text-amber-500" />
              <span>自訂圓形頭像裁切</span>
            </DialogTitle>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <div className="relative w-full h-64 bg-slate-950 rounded-2xl overflow-hidden border-2 border-kerning-stroke shadow-inner">
              {rawImageSrc && (
                <Cropper
                  image={rawImageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              )}
            </div>

            {/* 縮放調整滑桿 */}
            <div className="space-y-1.5 p-2 rounded-xl bg-black/5 dark:bg-black/25 border border-slate-300 dark:border-slate-700">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1">
                  <ZoomIn className="w-3.5 h-3.5 text-amber-500" />
                  <span>縮放比例 ({zoom.toFixed(1)}x)</span>
                </span>
                <span className="text-[10px] text-stone-500">可滑鼠滾輪或拖曳調整</span>
              </div>
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full h-2 bg-stone-300 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="parchment"
              size="sm"
              onClick={() => setIsCropModalOpen(false)}
            >
              取消
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleConfirmCrop}
              isLoading={isProcessing}
            >
              <Check className="w-4 h-4 mr-1" />
              <span>確認並套用頭像</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
