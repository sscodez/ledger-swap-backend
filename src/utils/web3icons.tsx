import { TokenIcon, WalletIcon, NetworkIcon } from '@web3icons/react'

type IconVariant = 'mono' | 'branded';
type IconSize = number | 'sm' | 'md' | 'lg';
type IconType = 'token' | 'wallet' | 'network';

interface Web3IconProps {
    symbol: string;
    variant?: IconVariant;
    size?: IconSize;
    type: IconType;
}

export default function App({ symbol, variant = 'branded', size = 'md', type }: Web3IconProps) {
    return (
        <>
            {type === 'token' && <TokenIcon symbol={symbol} variant={variant} size={size} />}
            {type === 'wallet' && <WalletIcon name={symbol} variant={variant} size={size} />}
            {type === 'network' && <NetworkIcon name={symbol} variant={variant} size={size} />}
        </>
    );
}