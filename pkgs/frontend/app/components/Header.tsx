import { Box, Flex, Text } from "@chakra-ui/react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { Link, useLocation, useNavigate, useParams } from "@remix-run/react";
import axios from "axios";
import { useActiveWalletIdentity } from "hooks/useENS";
import { useTreeInfo } from "hooks/useHats";
import { useActiveWallet } from "hooks/useWallet";
import { useEffect, useMemo, useState } from "react";
import type { HatsDetailSchama } from "types/hats";
import { ipfs2https } from "utils/ipfs";
import { abbreviateAddress } from "utils/wallet";
import CommonButton from "./common/CommonButton";
import { UserIcon } from "./icon/UserIcon";
import { WorkspaceIcon } from "./icon/WorkspaceIcon";
import { MenuContent, MenuItem, MenuRoot, MenuTrigger } from "./ui/menu";

const NO_HEADER_PATHS: string[] = ["/login", "/signup", "/"]; // 適宜ヘッダーが不要なページのパスを追加
const WORKSPACES_PATHS: string[] = ["/workspace", "/workspace/new"]; // 適宜ワークスペースが未選択な状態のページのパスを追加

const headerTextStyle = {
  color: "gray.800",
  wordBreak: "break-word",
};

enum HeaderType {
  NonHeader = "NonHeader",
  UserIconOnly = "UserIconOnly",
  WorkspaceAndUserIcons = "WorkspaceAndUserIcons",
}

export const Header = () => {
  const [headerType, setHeaderType] = useState<HeaderType>(
    HeaderType.NonHeader,
  );

  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { treeId } = useParams();
  const treeInfo = useTreeInfo(Number(treeId));

  const [workspaceName, setWorkspaceName] = useState<string>();
  useEffect(() => {
    const fetch = async () => {
      setWorkspaceName(undefined);
      const topHat = treeInfo?.hats?.find((hat) => hat.levelAtLocalTree === 0);
      if (topHat?.details) {
        const { data } = await axios.get<HatsDetailSchama>(
          ipfs2https(topHat.details) || "",
        );
        setWorkspaceName(data.data.name);
      }
    };
    fetch();
  }, [treeInfo]);

  useEffect(() => {
    const determineHeaderType = () => {
      if (!NO_HEADER_PATHS.includes(pathname)) {
        return !WORKSPACES_PATHS.includes(pathname) || workspaceName
          ? HeaderType.WorkspaceAndUserIcons
          : HeaderType.UserIconOnly;
      }
      return HeaderType.NonHeader;
    };

    setHeaderType(determineHeaderType());
  }, [pathname, workspaceName]);

  const { isSmartWallet } = useActiveWallet();
  const { logout } = usePrivy();
  const { wallets } = useWallets();
  const { identity } = useActiveWalletIdentity();

  const userImageUrl = useMemo(() => {
    const avatar = identity?.text_records?.avatar;
    return avatar ? ipfs2https(avatar) : undefined;
  }, [identity]);

  const handleLogout = () => {
    if (isSmartWallet) {
      logout();
    } else {
      if (wallets.find((w) => w.connectorType === "injected")) {
        alert("ウォレット拡張機能から切断してください。");
      } else {
        Promise.all(wallets.map((wallet) => wallet.disconnect()));
      }
    }
  };

  return headerType !== HeaderType.NonHeader ? (
    <Flex justifyContent="space-between" w="100%" py={3}>
      <Box display="flex" height="48px" flex="1" alignItems="center">
        {headerType === HeaderType.UserIconOnly && (
          <Text {...headerTextStyle} fontSize="xl" fontWeight="bold">
            Workspaces
          </Text>
        )}
        {headerType === HeaderType.WorkspaceAndUserIcons && (
          <>
            <MenuRoot>
              <MenuTrigger asChild>
                <button type="button" aria-label="Workspace menu">
                  <WorkspaceIcon
                    workspaceImageUrl={ipfs2https(
                      treeInfo?.hats?.find((hat) => hat.levelAtLocalTree === 0)
                        ?.imageUri,
                    )}
                    size="40px"
                  />
                </button>
              </MenuTrigger>
              <MenuContent
                mt={-6}
                ml={5}
                py={3}
                px={1}
                borderRadius={16}
                minW={44}
              >
                <MenuItem
                  value="workspace-settings"
                  asChild
                  px={4}
                  pt={2}
                  pb={1}
                  mb={2}
                  fontSize="sm"
                  cursor="pointer"
                >
                  <Link to={`/${treeId}/settings`}>ワークスペース設定</Link>
                </MenuItem>
                <MenuItem
                  value="workspace-list"
                  asChild
                  px={4}
                  pt={1}
                  pb={2}
                  fontSize="sm"
                  cursor="pointer"
                >
                  <Link to="/workspace">ワークスペース一覧</Link>
                </MenuItem>
              </MenuContent>
            </MenuRoot>
            <Text fontSize="lg" fontWeight="bold" {...headerTextStyle} ml={4}>
              {workspaceName}
            </Text>
          </>
        )}
      </Box>
      {identity ? (
        <MenuRoot>
          <MenuTrigger asChild>
            <button type="button">
              <UserIcon userImageUrl={userImageUrl} size="40px" />
            </button>
          </MenuTrigger>
          <MenuContent>
            <MenuItem
              value="name"
              bgColor="blue.100"
              display="block"
              closeOnSelect={false}
            >
              <Text fontWeight="bold">{identity.name}</Text>
              <Text fontSize="xs">
                {identity.name}.{identity.domain}
              </Text>
              <Text fontSize="xs">{abbreviateAddress(identity.address)}</Text>
            </MenuItem>
            {treeId && (
              <MenuItem
                value="profile"
                onClick={() => {
                  navigate(`/${treeId}/member/${identity.address}`);
                }}
                cursor="pointer"
                closeOnSelect={true}
              >
                プロフィール
              </MenuItem>
            )}
            <MenuItem
              value="executeTx"
              onClick={() => {
                navigate("/transaction");
              }}
              cursor="pointer"
            >
              Execute Tx
            </MenuItem>
            <MenuItem
              value="logout"
              onClick={handleLogout}
              cursor="pointer"
              closeOnSelect={true}
            >
              Logout
            </MenuItem>
          </MenuContent>
        </MenuRoot>
      ) : (
        <CommonButton
          onClick={() => {
            navigate("/login");
          }}
          w="auto"
        >
          Login
        </CommonButton>
      )}
    </Flex>
  ) : (
    <></>
  );
};
